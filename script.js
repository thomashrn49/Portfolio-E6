const particlesContainer = document.getElementById("particles");
const navLinks = document.querySelectorAll(".navbar a");
const sections = document.querySelectorAll("main section[id]");

const particleColors = ["blue", "gold"];

function createParticle() {
  if (!particlesContainer) return;

  const particle = document.createElement("span");
  const size = Math.random() * 8 + 6;
  const color = particleColors[Math.floor(Math.random() * particleColors.length)];

  particle.classList.add("particle", color);
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${Math.random() * 100}%`;
  particle.style.top = `${Math.random() * 100 + 10}%`;
  particle.style.animationDuration = `${Math.random() * 7 + 10}s`;
  particle.style.animationDelay = `${Math.random() * 2}s`;

  particlesContainer.appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, 17000);
}

for (let i = 0; i < 18; i++) {
  createParticle();
}

setInterval(createParticle, 900);

function updateActiveNav() {
  let currentSectionId = "accueil";
  const scrollPosition = window.scrollY + 140;

  sections.forEach((section) => {
    if (scrollPosition >= section.offsetTop) {
      currentSectionId = section.id;
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${currentSectionId}`) {
      link.classList.add("active");
    }
  });
}

window.addEventListener("scroll", updateActiveNav);
window.addEventListener("load", updateActiveNav);

const veilleList = document.getElementById("veille-list");
const veilleStatus = document.getElementById("veille-status");
const certFrFeedUrl = "https://www.cert.ssi.gouv.fr/feed/";
const rssToJsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(certFrFeedUrl)}`;
const maxVeilleArticles = 6;

function getTextContent(value) {
  if (!value) return "";

  return new DOMParser()
    .parseFromString(value, "text/html")
    .body.textContent.trim();
}

function parseFeedDate(value) {
  // rss2json renvoie "AAAA-MM-JJ HH:MM:SS" (UTC), format que certains navigateurs ne savent pas lire.
  const isoValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value || "")
    ? `${value.replace(" ", "T")}Z`
    : value;
  return new Date(isoValue);
}

function sortByMostRecent(articles) {
  return [...articles]
    .sort((a, b) => (parseFeedDate(b.date).getTime() || 0) - (parseFeedDate(a.date).getTime() || 0))
    .slice(0, maxVeilleArticles);
}

function formatPublicationDate(value) {
  const date = parseFeedDate(value);
  if (Number.isNaN(date.getTime())) return "Date non communiquée";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function createArticleCard(article) {
  const card = document.createElement("article");
  card.className = "veille-article";

  const date = document.createElement("time");
  date.className = "veille-article-date";
  date.dateTime = article.date;
  date.textContent = formatPublicationDate(article.date);

  const link = document.createElement("a");
  link.className = "veille-article-link";
  link.href = article.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = article.title;

  card.append(date, link);

  if (article.excerpt) {
    const excerpt = document.createElement("p");
    excerpt.className = "veille-article-excerpt";
    excerpt.textContent = article.excerpt;
    card.appendChild(excerpt);
  }

  return card;
}

function normalizeJsonArticles(data) {
  return (data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    date: item.pubDate,
    excerpt: getTextContent(item.description).slice(0, 220),
  }));
}

async function fetchCertFrArticles() {
  // Source principale : veille-data.js, régénéré chaque jour par GitHub Actions.
  const dailyData = window.VEILLE_DATA;
  if (dailyData?.articles?.length) {
    return { articles: sortByMostRecent(dailyData.articles), updatedAt: dailyData.updatedAt };
  }

  // Secours : relais RSS-to-JSON (ne renvoie qu'une partie du flux).
  const proxyResponse = await fetch(rssToJsonUrl);
  if (!proxyResponse.ok) throw new Error("Relais RSS indisponible");

  return { articles: sortByMostRecent(normalizeJsonArticles(await proxyResponse.json())), updatedAt: null };
}

async function loadCertFrFeed() {
  if (!veilleList || !veilleStatus) return;

  try {
    const { articles, updatedAt } = await fetchCertFrArticles();
    if (!articles.length) throw new Error("Aucune actualité disponible");

    veilleList.replaceChildren(...articles.map(createArticleCard));
    veilleStatus.textContent = updatedAt
      ? `Dernière mise à jour : ${formatPublicationDate(updatedAt)}`
      : "";
  } catch (error) {
    veilleStatus.classList.add("is-error");
    veilleStatus.textContent = "Les actualités ne peuvent pas être chargées pour le moment. Consultez directement le site du CERT-FR.";
  }
}

loadCertFrFeed();

// DOCUMENTATION SECTION
// Pour ajouter un document : déposer le PDF dans le dossier du site puis ajouter un objet ci-dessous.
const docsData = [
  {
    title: "VPN site à site IPsec",
    description: "Procédure de mise en place d'un tunnel VPN IPsec site à site entre deux pare-feu pfSense pour relier deux réseaux de manière chiffrée.",
    category: "technique",
    categoryLabel: "Guide technique",
    tags: ["pfSense", "VPN", "IPsec", "Pare-feu", "Sécurité"],
    image: "./vpn-ipsec.png",
    pdfPath: "./Fiche_procedure_VPN_site_a_site_pfSense.pdf",
    downloadName: "Procedure-VPN-IPsec-pfSense.pdf",
    pages: 8,
    size: "1 Mo"
  },
  {
    title: "Reverse proxy Nginx HTTPS",
    description: "Procédure de mise en place d'un reverse proxy Nginx en HTTPS devant deux serveurs web Apache, avec un certificat TLS délivré par l'autorité de certification pfSense.",
    category: "technique",
    categoryLabel: "Guide technique",
    tags: ["Nginx", "Apache", "HTTPS", "TLS", "Linux"],
    image: "./reverse-proxy.png",
    pdfPath: "./procédure reverse proxy.pdf",
    downloadName: "Procedure-reverse-proxy-Nginx.pdf",
    pages: 5,
    size: "260 Ko"
  },
  {
    title: "Opération Honeypot : Cowrie + Wazuh",
    description: "Déploiement d'un honeypot SSH Cowrie sous Docker, confinement du leurre (iptables, sortie fermée par défaut), centralisation des journaux dans le SIEM Wazuh avec règles et alerte mail, puis analyse robot / humain d'attaques simulées.",
    category: "technique",
    categoryLabel: "Guide technique",
    tags: ["Cowrie", "Wazuh", "SIEM", "Docker", "iptables", "Blue team"],
    image: "./honeypot.png",
    pdfPath: "./Fiche_procedure_Operation_Honeypot.pdf",
    downloadName: "Procedure-Operation-Honeypot-Cowrie-Wazuh.pdf",
    pages: 33,
    size: "800 Ko"
  }
];

const docsGrid = document.getElementById("docs-grid");
const docsFilters = document.querySelectorAll(".docs-filter");

function createDocsCard(doc) {
  const metas = ["PDF", doc.pages && `${doc.pages} pages`, doc.size].filter(Boolean).join(" · ");

  return `
    <article class="docs-card" data-category="${doc.category}">
      <div class="docs-card-image">
        <img src="${encodeURI(doc.image)}" alt="" loading="lazy">
        <span class="docs-card-category">${doc.categoryLabel}</span>
      </div>
      <div class="docs-card-body">
        <h3 class="docs-card-title">${doc.title}</h3>
        <p class="docs-card-meta">${metas}</p>
        <p class="docs-card-description">${doc.description}</p>
        <ul class="docs-card-tags" aria-label="Mots-clés">
          ${doc.tags.map((tag) => `<li class="docs-card-tag">${tag}</li>`).join("")}
        </ul>
        <div class="docs-card-actions">
          <a
            class="docs-card-action-btn docs-card-view"
            href="${encodeURI(doc.pdfPath)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Voir le document ${doc.title} dans un nouvel onglet"
          >
            <span aria-hidden="true">↗</span> Voir le document
          </a>
          <a
            class="docs-card-action-btn docs-card-download"
            href="${encodeURI(doc.pdfPath)}"
            download="${doc.downloadName || ""}"
            aria-label="Télécharger le document ${doc.title}"
          >
            <span aria-hidden="true">⬇</span> Télécharger
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderDocsCards(filter = "all") {
  if (!docsGrid) return;

  const filteredData = filter === "all" ? docsData : docsData.filter((doc) => doc.category === filter);

  docsGrid.innerHTML = filteredData.length
    ? filteredData.map(createDocsCard).join("")
    : `<p class="docs-empty">Aucune documentation dans cette catégorie pour le moment.</p>`;
}

function updateDocsFilterCounts() {
  docsFilters.forEach((filter) => {
    const category = filter.getAttribute("data-filter");
    const count = category === "all"
      ? docsData.length
      : docsData.filter((doc) => doc.category === category).length;

    if (!filter.dataset.label) filter.dataset.label = filter.textContent.trim();
    filter.innerHTML = `${filter.dataset.label} <span class="docs-filter-count">${count}</span>`;
  });
}

function setupDocsFilters() {
  docsFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      docsFilters.forEach((f) => {
        f.classList.remove("docs-filter-active");
        f.setAttribute("aria-pressed", "false");
      });
      filter.classList.add("docs-filter-active");
      filter.setAttribute("aria-pressed", "true");
      renderDocsCards(filter.getAttribute("data-filter"));
    });
  });
}

// Initialize
updateDocsFilterCounts();
renderDocsCards();
setupDocsFilters();
