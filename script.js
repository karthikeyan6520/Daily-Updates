/* ---------- CONFIG ---------- */
// Get a free key at https://currentsapi.services/ (free tier: 600 requests/day, CORS-enabled)
// and paste it below. Without a key the site still works using the sample stories.
const CURRENTS_API_KEY = "PUT_YOUR_FREE_CURRENTS_API_KEY_HERE";
const CACHE_KEY = "karthiNewsCache_v1";

/* ---------- FALLBACK / SAMPLE DATA ---------- */
// Used before the first successful fetch, if the API key is missing, or if the
// request fails (offline, rate-limited, etc). "Tamil Nadu" always stays on this
// list since no free API offers state-level Tamil Nadu news.
const fallbackNews=[
{id:1,cat:"Tamil Nadu",title:"Tamil Nadu: Sample local news headline",text:"Replace this sample with your own verified local news story and source.",date:"30 Sep 2026",img:"https://picsum.photos/seed/tn/900/550"},
{id:2,cat:"India",title:"India: Sample national news headline",text:"Use this section for important national stories and verified reports.",date:"30 Sep 2026",img:"https://picsum.photos/seed/india/900/550"},
{id:3,cat:"World",title:"World: Sample international headline",text:"Replace this placeholder with a current, verified international story.",date:"30 Sep 2026",img:"https://picsum.photos/seed/world/900/550"},
{id:4,cat:"Technology",title:"Technology: Latest tech developments",text:"Add technology, AI, software and gadget stories here.",date:"30 Sep 2026",img:"https://picsum.photos/seed/tech/900/550"},
{id:5,cat:"Sports",title:"Sports: Match and tournament updates",text:"Add verified sports news, fixtures and reports here.",date:"30 Sep 2026",img:"https://picsum.photos/seed/sport/900/550"},
{id:6,cat:"India",title:"India: Another sample story",text:"A second example showing how multiple stories appear.",date:"29 Sep 2026",img:"https://picsum.photos/seed/india2/900/550"}];

let news = fallbackNews;
let cat = "All";
const grid = document.querySelector("#grid"), empty = document.querySelector("#empty"),
      search = document.querySelector("#search"), updatedEl = document.querySelector("#updated");

/* ---------- RENDER ---------- */
function render(){
  let q = search.value.toLowerCase();
  let a = news.filter(n => (cat === "All" || n.cat === cat) &&
    (!q || (n.title + " " + n.text + " " + n.cat).toLowerCase().includes(q)));
  grid.innerHTML = a.map(n => `<article class="card"><img src="${n.img}" alt="" loading="lazy"><div class="body"><span class="tag">${n.cat}</span><h3>${n.title}</h3><p>${n.text}</p><p class="date">${n.date}</p><button class="read" onclick="openStory(${n.id})">Read full story →</button></div></article>`).join("");
  empty.style.display = a.length ? "none" : "block";
}

function openStory(id){
  let n = news.find(x => x.id === id);
  if(!n) return;
  mimg.src = n.img; mcat.textContent = n.cat; mtitle.textContent = n.title;
  mdate.textContent = n.date; mtext.textContent = n.text;
  modal.style.display = "grid";
}

/* ---------- STATIC UI WIRING ---------- */
document.querySelectorAll("nav a").forEach(a => a.onclick = e => {
  e.preventDefault();
  cat = a.dataset.cat;
  heading.textContent = cat === "All" ? "Latest News" : cat + " News";
  render();
});
search.oninput = render;
searchBtn.onclick = render;
readHero.onclick = () => openStory(fallbackNews[0].id);
// NOTE: this button's id was "close" before, which silently clashed with the
// browser's built-in window.close() function, so clicking × never worked.
// Renamed to "closeModal" in index.html/style.css to fix it.
closeModal.onclick = () => modal.style.display = "none";
modal.onclick = e => { if(e.target === modal) modal.style.display = "none"; };
theme.onclick = () => {
  document.body.classList.toggle("dark");
  theme.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
};

/* ---------- DAILY AUTO-UPDATE ---------- */
function todayStr(){ return new Date().toISOString().slice(0,10); }

function setUpdatedLabel(dateStr, source){
  updatedEl.textContent = "Last updated: " + dateStr + (source === "live" ? " (live)" : " (sample data)");
}

async function fetchCategory(params){
  const url = "https://api.currentsapi.services/v1/latest-news?apiKey=" + encodeURIComponent(CURRENTS_API_KEY) + "&language=en&" + params;
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if(!data.news) throw new Error("bad response");
  return data.news;
}

function toCard(article, cat, idCounter){
  return {
    id: idCounter,
    cat,
    title: article.title || "Untitled",
    text: article.description || "",
    date: article.published ? article.published.slice(0,10) : todayStr(),
    img: article.image && article.image !== "None" ? article.image : "https://picsum.photos/seed/" + idCounter + "/900/550"
  };
}

async function fetchFreshNews(){
  const [india, world, tech, sport] = await Promise.all([
    fetchCategory("country=IN"),
    fetchCategory("category=world"),
    fetchCategory("category=technology"),
    fetchCategory("category=sports")
  ]);
  let id = 1000;
  const fresh = [
    ...india.slice(0,6).map(a => toCard(a, "India", id++)),
    ...world.slice(0,6).map(a => toCard(a, "World", id++)),
    ...tech.slice(0,6).map(a => toCard(a, "Technology", id++)),
    ...sport.slice(0,6).map(a => toCard(a, "Sports", id++)),
    // Tamil Nadu has no reliable free live source, so it stays curated/sample:
    ...fallbackNews.filter(n => n.cat === "Tamil Nadu")
  ];
  return fresh;
}

async function loadNews(force){
  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); }catch(e){}

  if(!force && cached && cached.date === todayStr() && Array.isArray(cached.items) && cached.items.length){
    news = cached.items;
    setUpdatedLabel(cached.date, cached.source);
    render();
    return;
  }

  if(!CURRENTS_API_KEY || CURRENTS_API_KEY.indexOf("PUT_YOUR") === 0){
    news = cached && cached.items && cached.items.length ? cached.items : fallbackNews;
    setUpdatedLabel(cached ? cached.date : todayStr(), "sample");
    render();
    return;
  }

  try{
    const fresh = await fetchFreshNews();
    if(fresh.length){
      news = fresh;
      localStorage.setItem(CACHE_KEY, JSON.stringify({date: todayStr(), source:"live", items: fresh}));
      setUpdatedLabel(todayStr(), "live");
    } else {
      throw new Error("empty");
    }
  }catch(err){
    console.error("News fetch failed, using fallback:", err);
    news = cached && cached.items && cached.items.length ? cached.items : fallbackNews;
    setUpdatedLabel(cached ? cached.date : todayStr(), "sample");
  }
  render();
}

refreshBtn.onclick = () => loadNews(true);

loadNews(false);
