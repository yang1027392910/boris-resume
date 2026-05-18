/** @type {Record<string, Record<string, string | string[]>>} */
let i18n = {};

async function loadI18n() {
  const base = new URL("./", location.href);
  const [enUrl, zhUrl] = [
    new URL("./i18n/en.json", base),
    new URL("./i18n/zh_CN.json", base),
  ];

  console.log("[i18n] loading translations:", enUrl.href, zhUrl.href);

  const [en, zh] = await Promise.all([
    fetch(enUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${enUrl}`);
      return r.json();
    }),
    fetch(zhUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${zhUrl}`);
      return r.json();
    }),
  ]);

  i18n = { en, zh };
  console.log("[i18n] loaded languages:", Object.keys(i18n));
}

function getLangFromUrl() {
  return new URLSearchParams(location.search).get("lang") === "zh_CN" ? "zh" : "en";
}

function setLang(lang) {
  const data = i18n[lang];
  if (!data) return;

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = lang === "zh" ? "Boris - 简历" : "Boris - Resume";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (data[key] !== undefined) el.textContent = data[key];
  });

  document.querySelectorAll("[data-i18n-list]").forEach((ul) => {
    const key = ul.getAttribute("data-i18n-list");
    const items = data[key];
    if (!items) return;
    ul.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
  });

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  const url = new URL(location.href);
  if (lang === "zh") {
    url.searchParams.set("lang", "zh_CN");
  } else {
    url.searchParams.delete("lang");
  }
  history.replaceState(null, "", url);

  document.body.dataset.langReady = lang;
}

function bindLangSwitch() {
  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

async function init() {
  try {
    await loadI18n();
    bindLangSwitch();
    setLang(getLangFromUrl());
  } catch (err) {
    console.error("Failed to initialize resume i18n:", err);
  }
}

init();
