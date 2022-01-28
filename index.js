#!/usr/bin/env node

const { js2xml } = require("xml-js");
const fs = require("fs");
const path = require("path");
const modifyDate = new Date().toISOString();

class BaseNode {
  constructor() {
    this._data = {
      declaration: {
        attributes: {
          version: "1.0",
          encoding: "UTF-8",
        },
      },
      elements: [
        {
          type: "element",
          name: "urlset",
          attributes: {
            xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
            "xmlns:xhtml": "http://www.w3.org/1999/xhtml",
          },
          elements: [],
        },
      ],
    };
  }

  toJSON = () => this._data;

  setElements = (e) => {
    this._data.elements[0].elements = e;
  };
}

class Node {
  _data = {};
  constructor(type, name, attributes = {}, additional = {}) {
    this._data = {
      type,
      name,
      attributes,
      elements: [],
      ...additional,
    };
  }
  addElements = (el) => {
    this._data.elements = [...this._data.elements, ...el];
  };

  toJSON = () => this._data;
}

class SitemapGenerator {
  getHref = (lang, path) => {
    return [this._baseURL, lang, path].filter((v) => v.length).join("/");
  };

  getPageList = async () => {
    const files = await new Promise((resolve, reject) =>
      fs.readdir(path.join(process.cwd(), "pages", "[lang]"), (err, files) =>
        err ? reject(err) : resolve(files),
      ),
    );

    return files.map((f) => f.split(".tsx")[0]).filter((f) => f !== "index");
  };

  getTextNode = (tagName, text) => {
    const node = new Node("element", tagName);
    const textNode = new Node("text", null, null, { text });
    node.addElements([textNode.toJSON()]);
    return node.toJSON();
  };

  getLoc = (url) => this.getTextNode("loc", url);

  getLastmod = () => this.getTextNode("lastmod", modifyDate);

  getChangeFreq = () => this.getTextNode("changefreq", "daily");

  getPriority = (priority) => this.getTextNode("priority", priority ?? "0.7");

  getAlternateLinks = (langs, page) => {
    return langs.map((altLang, index) =>
      new Node("element", "xhtml:link", {
        rel: "alternate",
        hreflang: this.langs[index],
        href: this.getHref(altLang, page),
      }).toJSON(),
    );
  };

  getUrlNode = (page, lang, customLocUrl) => {
    const urlNode = new Node("element", "url");
    const url = customLocUrl ?? this.getHref(lang, page);

    const langs =
      page === ""
        ? ["", ...this.langs.filter((v) => v !== this._defaultLang)]
        : this.langs;

    const loc = this.getLoc(url);
    const alternate = this.getAlternateLinks(langs, page);
    const lastmod = this.getLastmod();
    const changeFreq = this.getChangeFreq();
    const priority = this.getPriority();

    urlNode.addElements([loc, changeFreq, priority, lastmod, ...alternate]);

    return urlNode.toJSON();
  };

  getPageNodes = (pages) => {
    const rootPageNodes = this.langs.map((lang) =>
      this.getUrlNode(
        "",
        lang,
        lang === this._defaultLang ? this._baseURL : undefined,
      ),
    );

    const pageNodes = pages.flatMap((page) =>
      this.langs.map((lang) => this.getUrlNode(page, lang)),
    );

    return [...rootPageNodes, ...pageNodes];
  };

  loadConfig = () => {
    const filePath = path.join(process.cwd(), "package.json");
    const buffer = fs.readFileSync(filePath);
    const config = JSON.parse(buffer);

    if (!config?.website || !Array.isArray(config?.localizations))
      throw new Error("No config found in package.json");

    return { _baseURL: config.website, langs: config.localizations };
  };

  writeSitemap = (data) => {
    const filePath = path.join(process.cwd(), "public", "sitemap.xml");
    fs.writeFileSync(filePath, js2xml(data, { compact: false }));
  };

  init = async () => {
    const { _baseURL, langs } = this.loadConfig();
    this._baseURL = _baseURL;
    this._defaultLang = langs[0];
    this.langs = langs;

    const pages = await this.getPageList();
    const pageNodes = this.getPageNodes(pages);

    const baseNode = new BaseNode();
    baseNode.setElements(pageNodes);
    this.writeSitemap(baseNode.toJSON());

    console.log("👊丂เ𝓉𝐄𝐦𝒶Ⓟ 𝕤𝓤𝓬𝓬𝐄𝕤𝕤𝔽𝓤ᒪᒪʸ Ğ𝐄𝓝𝐄ℝ𝒶𝓉𝐄𝓭👊");
  };

  constructor() {
    void this.init();
  }
}

new SitemapGenerator();
