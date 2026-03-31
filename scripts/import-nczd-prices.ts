/**
 * Импорт дерева прайса с https://nczd.ru/price/
 * Запуск: npx tsx scripts/import-nczd-prices.ts [--dry-run] [--clear]
 * Требуется DATABASE_URL / .env как у приложения.
 */

import "dotenv/config";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { PriceCatalogNodeKind } from "@prisma/client";
import { refreshSearchBlobForNode } from "../lib/price-catalog";
import { prisma } from "../lib/prisma";

const INDEX_URL = "https://nczd.ru/price/";
const DELAY_MS = 350;
const USER_AGENT = "nczd-lk-price-import/1.0 (+local script)";

type NavNode = {
  url: string;
  title: string;
  children: NavNode[];
};

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const CLEAR = args.includes("--clear");

const emptyUrls: string[] = [];
const fetchErrors: { url: string; message: string }[] = [];

function normalizeUrl(href: string): string {
  try {
    const u = new URL(href, INDEX_URL);
    if (u.hostname !== "nczd.ru" || !u.pathname.startsWith("/price")) {
      return href;
    }
    u.hash = "";
    u.search = "";
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    return `${u.origin}${path}`;
  } catch {
    return href;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return res.text();
}

function walkNav($: cheerio.CheerioAPI, $ul: cheerio.Cheerio<Element>): NavNode[] {
  const out: NavNode[] = [];
  $ul.children("li").each((_, li) => {
    const $li = $(li);
    const a = $li.children("a").first();
    const href = a.attr("href");
    const title = a.text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;
    const url = normalizeUrl(href);
    const $sub = $li.children("ul.children");
    const children = $sub.length ? walkNav($, $sub) : [];
    out.push({ url, title, children });
  });
  return out;
}

function parseNavTree(html: string): NavNode[] {
  const $ = cheerio.load(html);
  const root = $("ul.tabs-nav").first();
  if (!root.length) {
    throw new Error("Не найден ul.tabs-nav на странице прайса");
  }
  return walkNav($, root);
}

function rowLooksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return (
    /наименование|цена\s*\(руб|код услуги|код по номенклатуре/.test(joined) &&
    cells.length >= 2
  );
}

function looksLikePrice(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^от\s/i.test(t)) return true;
  if (/₽|руб/.test(t)) return true;
  return /^[\d\s.,−\-]+$/.test(t.replace(/\s/g, "")) && /\d/.test(t);
}

/** Извлечь строки услуг из таблиц на странице. */
export function extractServicesFromHtml(html: string): { title: string; price: string }[] {
  const $ = cheerio.load(html);
  const out: { title: string; price: string }[] = [];
  const seen = new Set<string>();

  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((_, tr) => {
        const cells = $(tr)
          .find("td")
          .map((_, td) =>
            $(td)
              .text()
              .replace(/\s+/g, " ")
              .trim(),
          )
          .get() as string[];

        if (cells.length < 2) return;
        if (rowLooksLikeHeader(cells)) return;

        let name: string;
        let price: string;

        if (cells.length >= 4) {
          name = cells[2] ?? "";
          price = cells[cells.length - 1] ?? "";
        } else if (cells.length === 3) {
          name = cells[1] ?? "";
          price = cells[2] ?? "";
        } else {
          name = cells[0] ?? "";
          price = cells[1] ?? "";
        }

        if (!name || name.length < 2) return;
        if (!looksLikePrice(price)) return;

        let priceText = price;
        if (!/₽|руб/i.test(priceText) && /^[\d\s.,−\-]+$/.test(priceText.replace(/\s/g, ""))) {
          priceText = `${priceText.trim()} ₽`;
        }

        const key = `${name}\t${priceText}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ title: name, price: priceText });
      });
  });

  return out;
}

async function importSubtree(
  parentId: string | null,
  nodes: NavNode[],
  sortBase: { n: number },
): Promise<void> {
  for (const node of nodes) {
    const sortOrder = sortBase.n++;

    const group = await prisma.priceCatalogNode.create({
      data: {
        parentId,
        kind: PriceCatalogNodeKind.GROUP,
        title: node.title,
        sourceUrl: node.url,
        sortOrder,
        searchBlob: "",
      },
    });
    await refreshSearchBlobForNode(prisma, group.id);

    await sleep(DELAY_MS);
    let services: { title: string; price: string }[] = [];
    try {
      const pageHtml = await fetchHtml(node.url);
      services = extractServicesFromHtml(pageHtml);
    } catch (e) {
      fetchErrors.push({
        url: node.url,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    if (services.length === 0) {
      emptyUrls.push(node.url);
    }

    let sOrder = 0;
    for (const s of services) {
      const row = await prisma.priceCatalogNode.create({
        data: {
          parentId: group.id,
          kind: PriceCatalogNodeKind.SERVICE,
          title: s.title,
          priceText: s.price,
          sourceUrl: node.url,
          sortOrder: sOrder++,
          searchBlob: "",
        },
      });
      await refreshSearchBlobForNode(prisma, row.id);
    }

    await importSubtree(group.id, node.children, sortBase);
  }
}

async function dryRunWalk(nodes: NavNode[]): Promise<{ groups: number; services: number }> {
  let groups = 0;
  let services = 0;
  for (const node of nodes) {
    groups++;
    await sleep(DELAY_MS);
    try {
      const pageHtml = await fetchHtml(node.url);
      const svc = extractServicesFromHtml(pageHtml);
      services += svc.length;
      if (svc.length === 0) {
        emptyUrls.push(node.url);
      }
    } catch (e) {
      fetchErrors.push({
        url: node.url,
        message: e instanceof Error ? e.message : String(e),
      });
      emptyUrls.push(node.url);
    }
    const sub = await dryRunWalk(node.children);
    groups += sub.groups;
    services += sub.services;
  }
  return { groups, services };
}

async function main(): Promise<void> {
  console.log(`Индекс: ${INDEX_URL}`);
  console.log(DRY ? "Режим DRY-RUN (запись в БД отключена)" : "Запись в БД включена");

  if (CLEAR && !DRY) {
    await prisma.$executeRawUnsafe("DELETE FROM PriceCatalogNode");
    console.log("Таблица PriceCatalogNode очищена (--clear).");
  } else if (CLEAR && DRY) {
    console.log("--clear игнорируется вместе с --dry-run.");
  }

  const indexHtml = await fetchHtml(INDEX_URL);
  const tree = parseNavTree(indexHtml);
  console.log(`Корневых разделов в меню: ${tree.length}`);

  if (DRY) {
    const stats = await dryRunWalk(tree);
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          navGroups: stats.groups,
          servicesRowsEstimate: stats.services,
        },
        null,
        2,
      ),
    );
  } else {
    const sortBase = { n: 0 };
    await importSubtree(null, tree, sortBase);
  }

  const report = {
    emptyUrlsSample: emptyUrls.slice(0, 80),
    emptyUrlsTotal: emptyUrls.length,
    fetchErrors,
  };
  console.log("Отчёт:", JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
