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

function getTextContent(value) {
  if (!value) return "";

  return new DOMParser()
    .parseFromString(value, "text/html")
    .body.textContent.trim();
}

function formatPublicationDate(value) {
  const date = new Date(value);
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

function normalizeXmlArticles(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Flux RSS invalide");

  return [...xml.querySelectorAll("item, entry")]
    .slice(0, 6)
    .map((item) => ({
      title: item.querySelector("title")?.textContent.trim(),
      link: item.querySelector("link")?.textContent.trim() || item.querySelector("link")?.getAttribute("href"),
      date: item.querySelector("pubDate, published, updated")?.textContent.trim(),
      excerpt: getTextContent(item.querySelector("description, summary, content")?.textContent).slice(0, 220),
    }))
    .filter((article) => article.title && article.link);
}

function normalizeJsonArticles(data) {
  return (data.items || []).slice(0, 6).map((item) => ({
    title: item.title,
    link: item.link,
    date: item.pubDate,
    excerpt: getTextContent(item.description).slice(0, 220),
  }));
}

async function fetchCertFrArticles() {
  try {
    const directResponse = await fetch(certFrFeedUrl);
    if (!directResponse.ok) throw new Error("Flux CERT-FR indisponible");

    const articles = normalizeXmlArticles(await directResponse.text());
    if (articles.length) return articles;
  } catch (error) {
    console.warn("Lecture directe du flux CERT-FR impossible, utilisation du relais RSS-to-JSON.");
  }

  const proxyResponse = await fetch(rssToJsonUrl);
  if (!proxyResponse.ok) throw new Error("Relais RSS indisponible");

  return normalizeJsonArticles(await proxyResponse.json());
}

async function loadCertFrFeed() {
  if (!veilleList || !veilleStatus) return;

  try {
    const articles = await fetchCertFrArticles();
    if (!articles.length) throw new Error("Aucune actualité disponible");

    veilleList.replaceChildren(...articles.map(createArticleCard));
    veilleStatus.remove();
  } catch (error) {
    veilleStatus.classList.add("is-error");
    veilleStatus.textContent = "Les actualités ne peuvent pas être chargées pour le moment. Consultez directement le site du CERT-FR.";
  }
}

loadCertFrFeed();

// DOCUMENTATION SECTION
const docsData = [
  {
    id: 1,
    title: "Installation de GLPI",
    description: "Installation et configuration de GLPI",
    category: "technique",
    categoryLabel: "Guide technique",
    tags: ["Linux", "GLPI", "Serveur", "Installation", "Configuration"],
    image: "./GLPI LOGO.png",
    pdfPath: "./install-GLPI.pdf"
  }
];

function renderDocsCards(filter = "all") {
  const docsGrid = document.getElementById("docs-grid");
  const filteredData = filter === "all" ? docsData : docsData.filter(doc => doc.category === filter);

  docsGrid.innerHTML = filteredData.map(doc => `
    <article class="docs-card" data-category="${doc.category}">
      <div class="docs-card-image">
        <img src="${doc.image}" alt="${doc.title}">
        <span class="docs-card-category">${doc.categoryLabel}</span>
        <div class="docs-card-tags">
          ${doc.tags.map(tag => `<span class="docs-card-tag">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="docs-card-body">
        <h3 class="docs-card-title">${doc.title}</h3>
        <p class="docs-card-description">${doc.description}</p>
        <div class="docs-card-actions">
          <button class="docs-card-action-btn" data-pdf="${doc.pdfPath}" aria-label="Voir le document PDF">
            Voir le document
          </button>
          <a href="${doc.pdfPath}" download class="docs-card-action-btn docs-card-download" aria-label="Télécharger le PDF" title="Télécharger le PDF">⬇</a>
        </div>
      </div>
    </article>
  `).join("");

  attachDocsCardListeners();
}

function attachDocsCardListeners() {
  document.querySelectorAll(".docs-card-action-btn:not(.docs-card-download)").forEach(btn => {
    btn.addEventListener("click", () => {
      const pdfPath = btn.getAttribute("data-pdf");
      openPdfModal(pdfPath);
    });
  });
}

function setupDocsFilters() {
  document.querySelectorAll(".docs-filter").forEach(filter => {
    filter.addEventListener("click", () => {
      document.querySelectorAll(".docs-filter").forEach(f => {
        f.classList.remove("docs-filter-active");
        f.setAttribute("aria-pressed", "false");
      });
      filter.classList.add("docs-filter-active");
      filter.setAttribute("aria-pressed", "true");
      renderDocsCards(filter.getAttribute("data-filter"));
    });
  });
}

// PDF MODAL FUNCTIONALITY
let pdfDoc = null;
let currentPage = 1;
let zoomLevel = 1;
const pdfModal = document.getElementById("pdf-modal");
const pdfCanvas = document.getElementById("pdf-canvas");
const pdfCtx = pdfCanvas.getContext("2d");
const pdfPageInput = document.getElementById("pdf-page-input");
const pdfTotalPages = document.getElementById("pdf-total-pages");
const pdfZoomLevel = document.getElementById("pdf-zoom-level");
const pdfOpenNewTab = document.getElementById("pdf-open-new-tab");

async function openPdfModal(pdfPath) {
  try {
    pdfDoc = await pdfjsLib.getDocument(pdfPath).promise;
    currentPage = 1;
    zoomLevel = 1;
    pdfTotalPages.textContent = ` / ${pdfDoc.numPages}`;
    pdfPageInput.max = pdfDoc.numPages;
    document.getElementById("pdf-modal-title").textContent = pdfPath.split("/").pop();
    pdfOpenNewTab.href = pdfPath;
    pdfModal.showModal();
    renderPdfPage(currentPage);
  } catch (error) {
    console.error("Erreur chargement PDF:", error);
    alert("Impossible de charger le PDF");
  }
}

async function renderPdfPage(pageNum) {
  if (!pdfDoc) return;
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: zoomLevel });
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    await page.render({ canvasContext: pdfCtx, viewport }).promise;
    pdfPageInput.value = pageNum;
  } catch (error) {
    console.error("Erreur rendu page:", error);
  }
}

document.getElementById("pdf-prev").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPdfPage(currentPage);
  }
});

document.getElementById("pdf-next").addEventListener("click", () => {
  if (pdfDoc && currentPage < pdfDoc.numPages) {
    currentPage++;
    renderPdfPage(currentPage);
  }
});

pdfPageInput.addEventListener("change", () => {
  const pageNum = parseInt(pdfPageInput.value);
  if (pdfDoc && pageNum > 0 && pageNum <= pdfDoc.numPages) {
    currentPage = pageNum;
    renderPdfPage(currentPage);
  }
});

document.getElementById("pdf-zoom-out").addEventListener("click", () => {
  if (zoomLevel > 0.5) {
    zoomLevel -= 0.1;
    pdfZoomLevel.textContent = Math.round(zoomLevel * 100) + "%";
    renderPdfPage(currentPage);
  }
});

document.getElementById("pdf-zoom-in").addEventListener("click", () => {
  if (zoomLevel < 2) {
    zoomLevel += 0.1;
    pdfZoomLevel.textContent = Math.round(zoomLevel * 100) + "%";
    renderPdfPage(currentPage);
  }
});

document.querySelector(".pdf-modal-close").addEventListener("click", () => {
  pdfModal.close();
});

pdfModal.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    pdfModal.close();
  }
});

// Initialize
renderDocsCards();
setupDocsFilters();