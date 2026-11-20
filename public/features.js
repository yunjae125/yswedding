// Contact and account sections remain absent until the couple supplies their details.
const $ = (id) => document.getElementById(id);
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3500);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("복사했습니다.");
  } catch {
    toast("복사할 수 없습니다. 브라우저 주소를 길게 눌러 복사해 주세요.");
  }
}
const weddingTime = new Date("2027-04-24T11:00:00+09:00");
function updateCountdown() {
  const today = new Date();
  const seoulDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const days = Math.round(
    (Date.parse("2027-04-24T00:00:00+09:00") -
      Date.parse(seoulDate + "T00:00:00+09:00")) /
      86400000,
  );
  $("countdown").textContent =
    days > 0
      ? `윤재와 소정의 결혼식이 ${days}일 남았습니다.`
      : days === 0
        ? "오늘, 저희 결혼식에 초대합니다."
        : "저희의 시작을 함께해 주셔서 감사합니다.";
}
updateCountdown();
setInterval(updateCountdown, 60000);
for (let row = 0; row < 5; row++) {
  const tr = document.createElement("tr");
  for (let col = 0; col < 7; col++) {
    const day = row * 7 + col - 3;
    const td = document.createElement("td");
    if (day >= 1 && day <= 30) {
      const span = document.createElement("span");
      span.textContent = day;
      if (day === 24) {
        span.className = "wedding-day";
        span.setAttribute("aria-label", "24일 결혼식");
      }
      td.append(span);
    }
    tr.append(td);
  }
  $("calendar-days").append(tr);
}
$("save-date").onclick = () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YS Wedding//Invitation//KO",
    "BEGIN:VEVENT",
    "UID:yunjae-sojung-20270424@yswedding",
    "DTSTAMP:20261006T000000Z",
    "DTSTART:20270424T020000Z",
    "DTEND:20270424T030000Z",
    "SUMMARY:yunjae & sojung 결혼식",
    "LOCATION:군산 스테이 웨딩 (전북특별자치도 군산시 성산면 철새로 56)",
    "DESCRIPTION:군산스테이호텔 별관 1층. 오전 11시 예식.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "yunjae-sojung-wedding.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("일정 파일을 열어 캘린더에 추가해 주세요.");
};
$("copy-address").onclick = () =>
  copy("전북특별자치도 군산시 성산면 철새로 56");
const shareUrl = () => new URL("./", location.href).href;
$("copy-link").onclick = () => copy(shareUrl());
$("share").onclick = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "yunjae & sojung 결혼합니다",
        text: "2027년 4월 24일 토요일 오전 11시 · 군산 스테이 웨딩",
        url: shareUrl(),
      });
    } catch (e) {
      if (e.name !== "AbortError") await copy(shareUrl());
    }
  } else await copy(shareUrl());
};
let page = 0,
  loadSequence = 0;
async function api(method, body) {
  const res = await fetch(
    (location.hostname === "yunjae125.github.io"
      ? "https://yswedding.ghkddbswo127.chatgpt.site"
      : "") +
      "/api/messages" +
      (method === "GET" ? `?page=${page}` : ""),
    {
      method,
      headers: method === "GET" ? {} : { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "잠시 후 다시 시도해 주세요.");
  return data;
}
async function loadMessages() {
  const sequence = ++loadSequence;
  $("guest-status").textContent = "마음을 불러오고 있습니다…";
  $("retry-messages").hidden = true;
  try {
    const data = await api("GET");
    if (sequence !== loadSequence) return;
    $("messages").replaceChildren();
    for (const item of data.messages) {
      const article = document.createElement("article");
      article.className = "message";
      const top = document.createElement("div");
      top.className = "message-top";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const date = document.createElement("time");
      date.dateTime = new Date(item.created).toISOString();
      date.textContent = new Date(item.created).toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
      });
      top.append(name, date);
      const p = document.createElement("p");
      p.textContent = item.message;
      const actions = document.createElement("div");
      actions.className = "message-actions";
      for (const [label, method] of [
        ["수정", "PATCH"],
        ["삭제", "DELETE"],
      ]) {
        const button = document.createElement("button");
        button.textContent = label;
        button.setAttribute("aria-label", `${item.name}님의 글 ${label}`);
        button.onclick = () => openForm(method, item);
        actions.append(button);
      }
      article.append(top, p, actions);
      $("messages").append(article);
    }
    $("guest-status").textContent = data.messages.length
      ? ""
      : "첫 번째 축하의 마음을 남겨주세요.";
    $("older-prev").disabled = page === 0;
    $("older-next").disabled = !data.hasMore;
    $("page-label").textContent = String(page + 1);
    $("guest-pagination").hidden = page === 0 && !data.hasMore;
  } catch (e) {
    if (sequence !== loadSequence) return;
    $("guest-status").textContent =
      "축하 글을 불러오지 못했습니다. 다시 시도해 주세요.";
    $("retry-messages").hidden = false;
  }
}
$("retry-messages").onclick = loadMessages;
$("older-prev").onclick = () => {
  if (page > 0) {
    page--;
    loadMessages();
  }
};
$("older-next").onclick = () => {
  page++;
  loadMessages();
};
const guestForm = $("guestbook-form");
const guestMessage = guestForm.elements.message;
const postButton = $("post-message");
const guestError = $("guest-submit-error");
let draftId;

function updateRemaining() {
  $("message-remaining").textContent =
    `남은 글자 ${guestMessage.maxLength - guestMessage.value.length}`;
}

function messagePayload(form, id) {
  return {
    id,
    name: form.elements.name.value,
    message: form.elements.message.value,
    password: form.elements.password.value,
  };
}

guestForm.addEventListener("input", () => {
  draftId = undefined;
  guestError.textContent = "";
  updateRemaining();
});

guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (postButton.disabled) return;

  // Keep the ID when retrying an unchanged draft after a connection failure.
  draftId ??= crypto.randomUUID();
  const body = messagePayload(guestForm, draftId);
  const fields = [
    guestForm.elements.name,
    guestForm.elements.password,
    guestMessage,
  ];
  postButton.disabled = true;
  postButton.textContent = "등록 중…";
  fields.forEach((field) => {
    field.readOnly = true;
  });
  guestError.textContent = "";
  try {
    await api("POST", body);
    guestForm.reset();
    draftId = undefined;
    updateRemaining();
    toast("따뜻한 마음을 전했습니다.");
    page = 0;
    await loadMessages();
  } catch (error) {
    guestError.textContent =
      error.message || "연결을 확인하고 다시 시도해 주세요.";
  } finally {
    fields.forEach((field) => {
      field.readOnly = false;
    });
    postButton.disabled = false;
    postButton.textContent = "메시지 등록";
  }
});

const form = $("message-form");
const formDialog = $("message-dialog");
const submitButton = $("submit-message");
const closeButton = $("close-form");
let editAction;

function openForm(method, item) {
  const deleting = method === "DELETE";
  editAction = { method, id: item.id };
  form.reset();
  $("form-error").textContent = "";
  $("message-fields").hidden = deleting;
  form.elements.name.required = !deleting;
  form.elements.message.required = !deleting;
  form.elements.name.value = item.name;
  form.elements.message.value = item.message;
  $("form-title").textContent = deleting ? "축하 글 삭제" : "축하 글 수정";
  submitButton.textContent = deleting ? "이 글 삭제하기" : "수정 내용 저장";
  formDialog.showModal();
  document.body.classList.add("modal-open");
}

closeButton.onclick = () => formDialog.close();
formDialog.addEventListener("cancel", (event) => {
  if (submitButton.disabled) event.preventDefault();
});
formDialog.addEventListener("close", () =>
  document.body.classList.remove("modal-open"),
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled || !editAction) return;
  const { method, id } = editAction;
  submitButton.disabled = true;
  closeButton.disabled = true;
  $("form-error").textContent = "";
  try {
    await api(method, messagePayload(form, id));
    formDialog.close();
    toast(method === "DELETE" ? "글을 삭제했습니다." : "수정했습니다.");
    page = 0;
    await loadMessages();
  } catch (error) {
    $("form-error").textContent =
      error.message || "연결을 확인하고 다시 시도해 주세요.";
  } finally {
    submitButton.disabled = false;
    closeButton.disabled = false;
  }
});

updateRemaining();
loadMessages();
