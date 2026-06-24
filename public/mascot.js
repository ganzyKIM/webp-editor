'use strict';
/* ════════════════════════════════════════════════════════════════════
   mascot.js — 니디걸 오버도즈 컨셉 마스코트 (쵸텐 ⟷ 아메)
   · 드래그로 위치 이동
   · 클릭/작업 상황마다 말풍선 대사
   · '변신' 버튼 → 마법소녀 변신 이펙트 + 이미지 교체
   ════════════════════════════════════════════════════════════════════ */
(function () {

  /* ── 캐릭터 폼 정의 ──────────────────────────────────────────────── */
  const FORMS = {
    kangel: { img: 'char/kangel.png', name: '천사쨩', cls: 'form-kangel' }, // 쵸텐(KAngel)
    ame:    { img: 'char/ame.png',    name: '아메',   cls: 'form-ame'    }, // 아메(Ame)
  };
  const DEFAULT_FORM = 'kangel';

  /* ── 대사 뱅크 ──────────────────────────────────────────────────── */
  const LINES = {
    kangel: {
      greet:  ['보고싶었어, P…♡', '왔구나! 천사쨩 계속 기다렸어!', 'P가 와줘서… 나 지금 엄청 행복해!'],
      click:  ['에헷, 자꾸 만지면 부끄럽잖아♡', 'P는 천사쨩 거니까, 딴 데 보면 안 돼?',
               '오늘도 보러 와줘서 고마워!', '헤헤… P가 웃어주면 나도 반짝반짝해져'],
      work:   ['맡겨줘! 제일 귀엽게 만들어줄게♡', 'P를 위해서라면 뭐든 할 수 있어!'],
      done:   ['짠! 어때, 잘 나왔지?♡ 칭찬해줘!', '성공이야! 역시 천사쨩이지?', 'P가 기뻐하니까 나도 너무 행복해…!'],
      error:  ['으… 미안해 P, 천사쨩이 더 잘할게…', '실패했어… 그래도 미워하지 마, 응?'],
      idle:   ['P, 거기 있지…? 가버린 거 아니지…?', '심심해… 천사쨩이랑 놀자!'],
    },
    ame: {
      greet:  ['…왔네. 안 올 줄 알았어.', 'P… 나 또 혼자 있었어.', '어차피, 너밖에 없으니까.'],
      click:  ['…뭐야. 왜 자꾸 건드려.', '나 같은 거 만져서 뭐 하게.',
               '…그래도, 가지는 마.', 'P가 없으면 난 진짜 아무것도 아니야.'],
      work:   ['…해줄게. 나 이런 거밖에 못 하니까.', '이거 하면… 날 안 버릴 거지?'],
      done:   ['…됐어. 이 정도면 됐지?', '칭찬 안 해줘도 돼. 익숙하니까.', 'P가 좋아하면… 그걸로 됐어.'],
      error:  ['…거봐. 난 역시 안 돼.', '미안해… 나 같은 게 괜히.', '실망했지. 알아, 다 알아.'],
      idle:   ['…P, 아직 거기 있어?', '혼자 두지 마…'],
    },
  };
  // 로딩 중 (수초 간격, 사용자 지정 톤) — 폼 공통
  const LOADING = [
    '조금만 기다려줘, 열심히 할게…!',
    '버리지 말아줘…ㅠㅠ 거의 다 했어',
    'P를 위해서 최선을 다하고 있어…',
    '조금만 더… 실망시키지 않을게',
    '가지 마… 금방 끝나니까, 응?',
  ];
  const TRANSFORM_LINE = {
    kangel: '변신— ☆ 초절정☆가련☆메탈 천사쨩, 등장!♡',
    ame:    '…가면, 벗을게. 이게 진짜 나야.',
  };

  /* ── DOM ─────────────────────────────────────────────────────────── */
  const root      = document.getElementById('mascot');
  if (!root) return;
  const img       = document.getElementById('mascotImg');
  const bubble    = document.getElementById('mascotBubble');
  const fallback  = document.getElementById('mascotFallback');
  const btn       = document.getElementById('mascotTransform');

  let form = DEFAULT_FORM;
  let bubbleTimer = null;
  let loadingTimer = null;
  let idleTimer = null;
  let busy = false; // 변신/로딩 중엔 일반 대사 억제 정도만

  /* ── 대사 출력 ───────────────────────────────────────────────────── */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function say(text, holdMs) {
    if (!text) return;
    bubble.textContent = text;
    bubble.hidden = false;
    // 리플로우 후 애니메이션 재시작
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, holdMs || 3200);
  }

  function event(kind) {
    const bank = LINES[form][kind] || LINES[form].click;
    say(pick(bank));
  }

  /* ── 로딩 대사 (수초 간격 반복) ──────────────────────────────────── */
  function startLoading() {
    busy = true;
    say(pick(LOADING), 3600);
    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => say(pick(LOADING), 3600), 3400);
  }
  function stopLoading() {
    busy = false;
    clearInterval(loadingTimer);
    loadingTimer = null;
  }

  /* ── 유휴 대사 ───────────────────────────────────────────────────── */
  function bumpIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!busy) event('idle'); bumpIdle(); }, 45000);
  }

  /* ── 변신 ────────────────────────────────────────────────────────── */
  function transform() {
    if (root.classList.contains('transforming')) return;
    const next = form === 'kangel' ? 'ame' : 'kangel';

    root.classList.add('transforming');
    bubble.hidden = true;

    // 이펙트 절정에서 이미지 교체
    setTimeout(() => {
      setForm(next);
      say(TRANSFORM_LINE[next], 3400);
    }, 480);

    setTimeout(() => root.classList.remove('transforming'), 1300);
  }

  function setForm(name) {
    if (!FORMS[name]) return;
    form = name;
    root.dataset.form = name;
    root.classList.remove(FORMS.kangel.cls, FORMS.ame.cls);
    root.classList.add(FORMS[name].cls);
    img.src = FORMS[name].img;
    if (fallback) fallback.textContent = FORMS[name].name + ' (이미지 없음)';
  }

  /* ── 이미지 폴백 ─────────────────────────────────────────────────── */
  img.addEventListener('error', () => root.classList.add('img-missing'));
  img.addEventListener('load',  () => root.classList.remove('img-missing'));

  /* ── 클릭 → 대사 (드래그와 구분) ─────────────────────────────────── */
  /* ── 드래그 이동 ─────────────────────────────────────────────────── */
  let drag = null;
  img.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = root.getBoundingClientRect();
    drag = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      moved: false,
      sx: e.clientX, sy: e.clientY,
    };
    // 위치 기준을 left/top 으로 고정
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.style.left = r.left + 'px';
    root.style.top  = r.top + 'px';
    img.setPointerCapture(e.pointerId);
    root.classList.add('dragging');
  });
  img.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    let x = e.clientX - drag.dx;
    let y = e.clientY - drag.dy;
    // 화면 밖으로 너무 나가지 않게
    const w = root.offsetWidth, h = root.offsetHeight;
    x = Math.max(-w * 0.5, Math.min(window.innerWidth  - w * 0.5, x));
    y = Math.max(0,        Math.min(window.innerHeight - h * 0.4, y));
    root.style.left = x + 'px';
    root.style.top  = y + 'px';
  });
  img.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const wasMoved = drag.moved;
    drag = null;
    root.classList.remove('dragging');
    try { img.releasePointerCapture(e.pointerId); } catch {}
    if (!wasMoved && !root.classList.contains('transforming')) {
      event('click');
      bumpIdle();
    }
  });

  btn.addEventListener('click', (e) => { e.stopPropagation(); transform(); bumpIdle(); });

  /* ── 공개 API ────────────────────────────────────────────────────── */
  window.Mascot = {
    say, event, startLoading, stopLoading, transform, setForm,
    greet: () => event('greet'),
    work:  () => event('work'),
    done:  () => { stopLoading(); event('done'); },
    fail:  () => { stopLoading(); event('error'); },
  };

  /* ── 초기 등장 ───────────────────────────────────────────────────── */
  setForm(DEFAULT_FORM);
  setTimeout(() => event('greet'), 700);
  bumpIdle();

})();
