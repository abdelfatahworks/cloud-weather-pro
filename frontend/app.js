const $ = s => document.querySelector(s);
const labels = {0:["سماء صافية","☀️"],1:["صحو غالبًا","🌤️"],2:["غائم جزئيًا","⛅"],3:["غائم","☁️"],45:["ضباب","🌫️"],48:["ضباب متجمد","🌫️"],51:["رذاذ خفيف","🌦️"],53:["رذاذ متوسط","🌦️"],55:["رذاذ كثيف","🌧️"],61:["مطر خفيف","🌦️"],63:["مطر متوسط","🌧️"],65:["مطر غزير","🌧️"],71:["ثلوج خفيفة","🌨️"],73:["ثلوج متوسطة","🌨️"],75:["ثلوج كثيفة","❄️"],80:["زخات مطر","🌦️"],81:["زخات متوسطة","🌧️"],82:["زخات قوية","⛈️"],95:["عاصفة رعدية","⛈️"],96:["عاصفة مع بَرَد","⛈️"],99:["عاصفة قوية","⛈️"]};
const condition = code => labels[code] || ["حالة جوية متغيرة","🌡️"];
const fmt = (n,s="") => Number.isFinite(Number(n)) ? `${Math.round(Number(n))}${s}` : `—${s}`;
function message(text,error=false){$("#message").textContent=text;$("#message").classList.toggle("error",error)}
async function loadHistory(){
  const list=$("#history-list");
  try{
    const r=await fetch("/api/history"),data=await r.json(); if(!r.ok) throw Error();
    list.replaceChildren();
    if(!data.items?.length){const p=document.createElement("small");p.className="muted";p.textContent="لا توجد عمليات بحث محفوظة بعد.";list.append(p);return}
    data.items.forEach(x=>{const row=document.createElement("div");row.className="history-item";const name=document.createElement("b");name.textContent=[x.city,x.country].filter(Boolean).join("، ");const temp=document.createElement("span");temp.textContent=x.temperature_c==null?"—":fmt(x.temperature_c,"°");row.append(name,temp);list.append(row)});
  }catch{list.textContent="سجل البحث غير متاح الآن."}
}
function render(data){
 const c=data.current||{},[desc,icon]=condition(c.weather_code);
 $("#place-name").textContent=data.city||"—";$("#place-subtitle").textContent=[data.admin1,data.country].filter(Boolean).join("، ");
 $("#weather-icon").textContent=icon;$("#temperature").textContent=fmt(c.temperature_2m,"°");$("#condition").textContent=desc;
 $("#feels-like").textContent=`المحسوس ${fmt(c.apparent_temperature,"°")}`;$("#humidity").textContent=fmt(c.relative_humidity_2m,"%");
 $("#wind").textContent=fmt(c.wind_speed_10m," كم/س");$("#precipitation").textContent=fmt(c.precipitation," مم");
 $("#updated-at").textContent=c.time?`وقت القياس المحلي: ${c.time.replace("T"," ")}`:"";
 const list=$("#forecast-list");list.replaceChildren();const d=data.daily||{};
 (d.time||[]).slice(0,3).forEach((date,i)=>{const row=document.createElement("div");row.className="day";const day=document.createElement("span");day.textContent=i===0?"اليوم":i===1?"غدًا":new Intl.DateTimeFormat("ar",{weekday:"long"}).format(new Date(date+"T12:00:00"));const [label,emoji]=condition((d.weather_code||[])[i]);const ico=document.createElement("span");ico.textContent=emoji;ico.title=label;const temps=document.createElement("span");temps.className="temps";const hi=document.createElement("b");hi.textContent=fmt((d.temperature_2m_max||[])[i],"°");const lo=document.createElement("span");lo.textContent=fmt((d.temperature_2m_min||[])[i],"°");temps.append(hi,lo);row.append(day,ico,temps);list.append(row)});
 $("#weather-panel").classList.remove("hidden");
}
async function search(city){
 city=city.trim();if(!city){message("اكتب اسم مدينة أولًا.",true);return}
 $("#city").value=city;$("#search-button").disabled=true;message("جارٍ جلب بيانات الطقس...");
 try{const r=await fetch("/api/weather?city="+encodeURIComponent(city));const data=await r.json();if(!r.ok)throw Error(data.error||"تعذر جلب بيانات الطقس");render(data);message(`تم تحديث الطقس في ${data.city}.`);await loadHistory()}
 catch(e){message(e.message||"حدث خطأ غير متوقع. حاول مرة أخرى.",true)}
 finally{$("#search-button").disabled=false}
}
$("#search-form").addEventListener("submit",e=>{e.preventDefault();search($("#city").value)});
document.querySelectorAll("[data-city]").forEach(b=>b.addEventListener("click",()=>search(b.dataset.city)));
$("#refresh-history").addEventListener("click",loadHistory);loadHistory();
