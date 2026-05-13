const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
};

const renderTags = (tags) =>
  tags.map((tag) => `<span class="tag">${tag}</span>`).join("");

const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
};

const setHref = (selector, href) => {
  const element = document.querySelector(selector);
  if (element) element.href = href;
};

const renderHero = (content, profile) => {
  setText(".hero .eyebrow", content.hero.eyebrow);
  document.querySelector("#hero-title").innerHTML = content.hero.heading
    .map((line) => `<span>${line}</span>`)
    .join("");
  setText(".hero-lede", content.hero.description);

  setHref('[data-link="github"]', profile.contactLinks.github);
  setHref('[data-link="huggingFace"]', profile.contactLinks.huggingFace);
  setHref('[data-link="x"]', profile.contactLinks.x);
};

const renderSelectedWork = (selectedWork) => {
  setText("#work .eyebrow", selectedWork.eyebrow);
  setText("#work h2", selectedWork.heading);
  setText("#work .section-heading-row p:not(.eyebrow)", selectedWork.description);
  setHref("#all-repos-link", selectedWork.allReposUrl);

  const featuredProjects = selectedWork.projects.filter((project) => project.featured);
  const supportingProjects = selectedWork.projects.filter((project) => !project.featured);

  document.querySelector("#featured-projects").innerHTML = featuredProjects
    .map(
      (project) => `
        <article class="featured-project reveal" data-accent="${project.accent}">
          <div class="project-topline">
            <span>${project.kind}</span>
            <small>${project.updated}</small>
          </div>
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <div class="tag-row">${renderTags(project.tags)}</div>
          <a class="card-link" href="${project.link}" target="_blank" rel="noreferrer">View project <span aria-hidden="true">-&gt;</span></a>
        </article>
      `,
    )
    .join("");

  document.querySelector("#project-grid").innerHTML = supportingProjects
    .map(
      (project) => `
        <article class="project-card reveal">
          <div class="project-topline">
            <span>${project.kind}</span>
            <small>${project.updated}</small>
          </div>
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <div class="tag-row">${renderTags(project.tags)}</div>
          <a class="card-link" href="${project.link}" target="_blank" rel="noreferrer">View project <span aria-hidden="true">-&gt;</span></a>
        </article>
      `,
    )
    .join("");
};

const renderTechnicalFocus = (technicalFocus) => {
  setText("#focus .eyebrow", technicalFocus.eyebrow);
  setText("#focus-heading", technicalFocus.heading);
  setText("#focus .section-copy p:not(.eyebrow)", technicalFocus.description);

  document.querySelector("#mode-track").innerHTML = technicalFocus.focusAreas
    .map(
      (focus) => `
        <article class="mode-card reveal" data-code="${focus.code}">
          <span class="mode-code">${focus.code}</span>
          <h3>${focus.title}</h3>
          <p>${focus.body}</p>
          <small>${focus.source}</small>
        </article>
      `,
    )
    .join("");

  const maxLanguageCount = Math.max(
    ...technicalFocus.languageStats.map((item) => item.count),
  );
  document.querySelector("#language-bars").innerHTML = technicalFocus.languageStats
    .map(
      (item) => `
        <div class="language-row">
          <div class="language-meta">
            <span>${item.name}</span>
            <strong>${item.count}</strong>
          </div>
          <div class="bar-track" aria-hidden="true">
            <span style="width: ${(item.count / maxLanguageCount) * 100}%; background: ${item.color}"></span>
          </div>
        </div>
      `,
    )
    .join("");

  document.querySelector("#tech-cloud").innerHTML = technicalFocus.techTags
    .map((tag) => `<span class="tech-pill">${tag}</span>`)
    .join("");
};

const renderExperiments = (experiments) => {
  setText("#experiments .eyebrow", experiments.eyebrow);
  setText("#experiments h2", experiments.heading);
  setText("#experiments .section-copy p:not(.eyebrow)", experiments.description);

  document.querySelector("#experiments-grid").innerHTML = experiments.items
    .map(
      (item) => `
        <article class="build-card reveal">
          <p class="card-label">${item.label}</p>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
          <div class="tag-row">${renderTags(item.meta)}</div>
          <a class="card-link" href="${item.link}" target="_blank" rel="noreferrer">View project <span aria-hidden="true">-&gt;</span></a>
        </article>
      `,
    )
    .join("");
};

const renderContact = (contact, profile) => {
  setText("#contact .eyebrow", contact.eyebrow);
  setText("#contact h2", contact.heading);
  setText("#contact p:not(.eyebrow)", contact.description);
  setHref('#contact [data-link="github"]', profile.contactLinks.github);
  setHref('#contact [data-link="x"]', profile.contactLinks.x);
  setHref('#contact [data-link="huggingFace"]', profile.contactLinks.huggingFace);
};

const observeReveals = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
};

const init = async () => {
  const [profile, content] = await Promise.all([
    fetchJson("./data/profile.json"),
    fetchJson("./data/portfolio-content.json"),
  ]);

  renderHero(content, profile);
  renderSelectedWork(content.selectedWork);
  renderTechnicalFocus(content.technicalFocus);
  renderExperiments(content.experiments);
  renderContact(content.contact, profile);
  observeReveals();
};

init().catch((error) => {
  console.error(error);
  document.body.classList.add("content-load-error");
});

document.addEventListener("pointermove", (event) => {
  const x = `${(event.clientX / window.innerWidth) * 100}%`;
  const y = `${(event.clientY / window.innerHeight) * 100}%`;
  document.documentElement.style.setProperty("--pointer-x", x);
  document.documentElement.style.setProperty("--pointer-y", y);
});
