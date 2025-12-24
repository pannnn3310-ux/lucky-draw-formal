let allNames = [];
let winnerData = [];
let drawnWinners = new Set();
let isConfirming = false;


const scrollArea = document.querySelector('#scroll-area');
const dropdownButton = document.querySelector('#prize-btn');
const prizeText = document.querySelector
  ('#prize-btn');
const lever = document.querySelector('.lever');
const dropdownItems = document.querySelectorAll('.dropdown-item');
const specialPrizeContainer = document.querySelector('#special-prize-container');
const specialPrizeInput = document.querySelector('#special-prize-input');
const specialPrizeInput2 = document.querySelector('#special-prize-input2');
const winnerLists = [
  document.querySelector('#winner-list'),
  document.querySelector('#winner-list-mobile')
];


const ITEM_HEIGHT = 90;

//設定拉霸三軸
const reels = [
  {
    el: document.createElement('div'),
    items: [],
    position: 0
  },
  {
    el: document.createElement('div'),
    items: [],
    position: 0
  },
  {
    el: document.createElement('div'),
    items: [],
    position: 0
  }
];

reels.forEach(r => {
  r.el.className = 'reel';
  scrollArea.appendChild(r.el);
});


// 匯入Excel
document.querySelectorAll('#file-input').forEach(input => {
  input.addEventListener('change', e => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {
        type: 'array'
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      allNames = json.slice(1).map(row => {
        const dept = row[0]?.trim();
        const name = row[1]?.trim();
        if (!dept || !name) return null;

        let firstPart = '', restPart = '';
        if (name.length >= 4)
          firstPart = name.slice(0, 2),
            restPart = name.slice(-2);
        else if (name.length === 3)
          firstPart = name.charAt(0),
            restPart = name.slice(1);
        else firstPart = name.charAt(0),
          restPart = name.slice(1);
        return {
          dept, firstPart, restPart
        };
      }).filter(Boolean);

      populateReels();
      startAutoScroll();
      updateCounts();
    };
    reader.readAsArrayBuffer(e.target.files[0]);
  });
});

// 匯出Excel
document.querySelector('#export-btn').addEventListener('click', () => {
  if (winnerData.length === 0) {
    const listToast = document.querySelector('#list-toast-body');
      listToast.textContent = `還沒有中獎名單可匯出！`;
      const toastElement = document.querySelector('#list-toast');
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
    return;
  };

  //轉成Excel
  const wsData = winnerData.map(w => [
    w.prize,
    w.bonus,
    w.dept,
    w.name,
  ]);

  //加標題列
  const ws = XLSX.utils.aoa_to_sheet([['獎項', '加碼', '部門', '姓名']].concat(wsData));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '中獎名單');

  //下載 Excel
  XLSX.writeFile(wb, '大寶尾牙中獎名單.xlsx');
});


function populateReels() {
  reels.forEach(r => {
    r.el.innerHTML = '';
    r.items = [];
    r.mapIndex = []; // 新增對應表
  });

  const minItems = 12;
  let displayNames = [...allNames];
  while (displayNames.length < minItems) {
    displayNames = displayNames.concat(allNames);
  };

  displayNames.forEach(({ dept, firstPart, restPart }, displayIdx) => {
    [dept, firstPart, restPart].forEach((val, i) => {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent = val;
      reels[i].el.appendChild(div);
      reels[i].items.push(div);
      reels[i].mapIndex.push(displayIdx % allNames.length);
    });
  });
};

function ensureReelLoop(reel, reelIndex) {
  const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
  const threshold = ITEM_HEIGHT * 3; // 提前3筆追加
  if (reel.position + viewportHeight > reel.items.length * ITEM_HEIGHT - threshold) {
    // 追加一輪名單，但只加對應軸的值
    allNames.forEach((nameObj, idx) => {
      let val = '';
      if (reelIndex === 0) val = nameObj.dept;
      else if (reelIndex === 1) val = nameObj.firstPart;
      else if (reelIndex === 2) val = nameObj.restPart;

      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent = val;
      reel.el.appendChild(div);
      reel.items.push(div);
      reel.mapIndex.push(idx); // 正確對應原始索引
    });
  }
};


// 自動滾動
let autoScrollId = null;
function startAutoScroll() {
  if (autoScrollId !== null) return;
  lever.classList.remove('no-glow');
  let lastTime = performance.now();

  function step(now) {
    const delta = now - lastTime;
    lastTime = now;

    reels.forEach((reel, idx) => {
      const speed = ITEM_HEIGHT * 1;
      reel.position += speed * (delta / 1000);

      ensureReelLoop(reel, idx); // 傳入 reelIndex

      const totalHeight = ITEM_HEIGHT * reel.items.length;
      reel.el.style.transform = `translateY(-${reel.position % totalHeight}px)`;
    });

    autoScrollId = requestAnimationFrame(step);
  };

  autoScrollId = requestAnimationFrame(step);
};

//停止名單滾動
function stopAutoScroll() {
  cancelAnimationFrame(autoScrollId);
  autoScrollId = null;
};

// 下拉選單
dropdownItems.forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const value = item.dataset.value;
    prizeText.textContent = item.textContent;
    dropdownButton.dataset.value = value;

    if (value === "9") {
      specialPrizeContainer.style.display = "block";
      specialPrizeInput.style.display = "inline-block";
      specialPrizeInput2.style.display = "none";
    } else if (value === "10"){
      specialPrizeContainer.style.display = "block";
      specialPrizeInput2.style.display = "inline-block";
      specialPrizeInput.style.display = "none";
    } else {
      specialPrizeContainer.style.display = "none";
    };

  });
});


// 拉霸按鈕事件
document.querySelectorAll('.lever .prize-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isConfirming) return;
    if (allNames.length === 0) {
      // alert("請先匯入名單！");
      const listToast = document.querySelector('#list-toast-body');
      listToast.textContent = `請先匯入抽獎名單！`;
      const toastElement = document.querySelector('#list-toast');
      const toast = new bootstrap.Toast(toastElement);
      toast.show();

      return;
    };
    lever.classList.add("pull");
    lever.classList.add("no-glow");
    await new Promise(resolve => setTimeout(resolve, 300));

    reels.forEach(r => r.items.forEach(item => item.classList.remove('winner-highlight')));

    if (!isConfirming && autoScrollId !== null) {
      await doDraw();
    };
    lever.classList.remove("pull");
  });
});

//獎項圈數設定
function getFullRounds(prizeValue) {
  const roundsMap = {
    1: 15,
    2: 12,
    3: 10,
    4: 9,
    5: 7,
    6: 5,
    7: 4,
    8: 3,
    9: 3,
    10: 3
  };
  return roundsMap[prizeValue] || 3;
};


// 抽獎

async function doDraw() {
  // **抽出還未中獎列表，用途，避免重覆中獎
  const available = allNames.filter(p => !drawnWinners.has(`${p.dept}-${p.firstPart}${p.restPart}`));
  if (available.length === 0) {
    alert("所有人都已中獎！");
    return;
  };

  stopAutoScroll();
  isConfirming = true;
  const main = document.querySelector('.main');
  main.classList.add('active');

  const hand = document.getElementById('hand-animation-container');
  hand.style.display = 'block';
  handAnim.goToAndPlay(0, true); // 從頭播放

  // **決定中獎者的地方,已平均隨機方式抽取一名
  const winner = available[Math.floor(Math.random() * available.length)];

  // **紀錄中獎者避免重複抽到
  drawnWinners.add(`${winner.dept}-${winner.firstPart}${winner.restPart}`);

  // 原始名單索引
  const winnerIndex = allNames.findIndex(p =>
    p.dept === winner.dept && p.firstPart === winner.firstPart && p.restPart === winner.restPart
  );

  // 每軸對應 reel.items 的索引
  const reelTargetIndexes = reels.map((r, i) => {
    // 找出第二輪的 target 元素
    const idxs = r.mapIndex
      .map((v, index) => ({ v, index }))
      .filter(x => x.v === winnerIndex);
    return idxs.length > 1 ? idxs[1].index : idxs[0].index; // 第二輪
  });
  const prizeValue = parseInt(dropdownButton.dataset.value) || 1;
  const fullRounds = getFullRounds(prizeValue);

  const baseDuration = 800;
  const durationPerRound = 200;

  const reelDurations = [
    baseDuration + fullRounds * durationPerRound,
    baseDuration + fullRounds * durationPerRound + 300,
    baseDuration + fullRounds * durationPerRound + 600
  ];

  if (dropdownButton.dataset.value === "1") {
    // 獎項1：分兩段滾輪 + 中間暫停動畫
    const halfRounds = Math.floor(fullRounds / 2);

    // 第一段滾輪：滾到距離中獎者還 3 格的位置（修正避免空白或消失）
    const preTargetIndexes = reels.map((r, i) => {
      const target = reelTargetIndexes[i];
      const fullLength = r.mapIndex.length;

      // 第一段滾輪至少跑一圈，保護不越界
      const safeIdx = (target - 3 + fullLength) % fullLength;
      return safeIdx;
    });

    await Promise.all([
      spinReel(reels[0], preTargetIndexes[0], reelDurations[0] / 2, 0, halfRounds),
      spinReel(reels[1], preTargetIndexes[1], reelDurations[1] / 2, 0, halfRounds),
      spinReel(reels[2], preTargetIndexes[2], reelDurations[2] / 2, 0, halfRounds)
    ]);

    // 暫停 + 動畫（你的淡出/彈入/空白邏輯）
    await freezeMidAnimation();

    // 第二段滾輪：分別啟動，每軸帶入小 delay 以產生依序停的感覺
    const p0 = spinReel(reels[0], reelTargetIndexes[0], reelDurations[0] / 2, 0, fullRounds - halfRounds)
      .then(() => highlightReel(0, reelTargetIndexes[0]));
    const p1 = spinReel(reels[1], reelTargetIndexes[1], reelDurations[1] / 2, 150, fullRounds - halfRounds)
      .then(() => highlightReel(1, reelTargetIndexes[1]));
    const p2 = spinReel(reels[2], reelTargetIndexes[2], reelDurations[2] / 2, 300, fullRounds - halfRounds)
      .then(() => highlightReel(2, reelTargetIndexes[2]));

    await Promise.all([p0, p1, p2]);

    // 保險：把位置修正到精準的 target
    reels.forEach((r, i) => {
      const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
      const centerOffset = (viewportHeight / 2) - (ITEM_HEIGHT / 2);
      const targetPos = reelTargetIndexes[i] * ITEM_HEIGHT - centerOffset;
      r.position = targetPos;
      r.el.style.transform = `translateY(-${r.position}px)`;
    });

    // 中獎文字與效果
    handleWinnerText(winner);

    setTimeout(() => {
      main.classList.remove('active');
      lever.classList.remove('no-glow');
      startAutoScroll();
      isConfirming = false;
      // 隱藏手動畫
      const hand = document.getElementById('hand-animation-container');
      hand.style.display = 'none';
      handAnim.stop();
    }, 4000);
  } else {
    // 其他獎項保持原流程
    const p0 = spinReel(reels[0], reelTargetIndexes[0], reelDurations[0], 0, fullRounds)
      .then(() => highlightReel(0, reelTargetIndexes[0]));
    const p1 = spinReel(reels[1], reelTargetIndexes[1], reelDurations[1], 0, fullRounds)
      .then(() => highlightReel(1, reelTargetIndexes[1]));
    const p2 = spinReel(reels[2], reelTargetIndexes[2], reelDurations[2], 0, fullRounds)
      .then(() => highlightReel(2, reelTargetIndexes[2]))
      .then(() => {
        // 最終停齊位置
        reels.forEach((r, i) => {
          const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
          const centerOffset = (viewportHeight / 2) - (ITEM_HEIGHT / 2);
          const targetPos = reelTargetIndexes[i] * ITEM_HEIGHT - centerOffset;
          r.position = targetPos;
          r.el.style.transform = `translateY(-${r.position}px)`;
          r.items[reelTargetIndexes[i]].classList.add('winner-highlight');
        });
        handleWinnerText(winner);
          const hand = document.getElementById('hand-animation-container');
          hand.style.display = 'none';
          handAnim.stop();
        setTimeout(() => {
          main.classList.remove('active');
          lever.classList.remove('no-glow');
          startAutoScroll();
          isConfirming = false;
        }, 4000);
      });
  };
};


function spinReel(reel, targetIndex, duration = 3000, delay = 0, fullRounds = 3) {
  return new Promise(resolve => {
    setTimeout(() => {
      const start = performance.now();
      const startPos = reel.position;
      const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
      const centerOffset = (viewportHeight / 2) - (ITEM_HEIGHT / 2);

      // 找第一個對應 targetIndex 的位置
      const reelTargetIndex = reel.mapIndex.indexOf(targetIndex);
      const targetPos = targetIndex * ITEM_HEIGHT - centerOffset;
      const totalHeight = ITEM_HEIGHT * reel.items.length;

      function easeOutQuad(t) { return t * (2 - t); }

      function animate(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;
        const eased = easeOutQuad(t);

        const virtualPos = startPos + (targetPos - startPos + totalHeight * fullRounds) * eased;
        const newPos = ((virtualPos % totalHeight) + totalHeight) % totalHeight;
        reel.position = newPos;
        reel.el.style.transform = `translateY(-${newPos}px)`;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          let finalPos = ((targetPos % totalHeight) + totalHeight) % totalHeight;
          reel.position = finalPos;
          reel.el.style.transform = `translateY(-${finalPos}px)`;
          resolve();
        };
      };
      requestAnimationFrame(animate);
    }, delay);
  });
};



// 中獎框線
function highlightReel(i, winnerIndex) {
  reels[i].items.forEach(item => item.classList.remove('winner-highlight'));
  reels[i].items[winnerIndex].classList.add('winner-highlight');
};


// 紙花特效
function showWinnerEffect() {
  if (typeof confetti !== 'undefined') {
    const count = 800;
    const defaults = { origin: { x: 0.5, y: 0.6 } };
    function fire(ratio, opts) { confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) }); }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
    confetti({ origin: { x: 0.1, y: 0.9 }, angle: 60, spread: 100, startVelocity: 45, particleCount: 200, scalar: 1.1, decay: 0.9 });
    confetti({ origin: { x: 0.9, y: 0.9 }, angle: 120, spread: 100, startVelocity: 45, particleCount: 200, scalar: 1.1, decay: 0.9 });
  };
};

//整合中獎後續動作特效
function handleWinnerText(winner) {
  let displayText = '';
  let bonusText = '';

  if (dropdownButton.dataset.value === "8") {
    const bonus = specialPrizeInput.value.trim();
    if (bonus) bonusText = bonus;
    displayText = `特別獎：${winner.dept} - ${winner.firstPart}${winner.restPart}`;
    specialPrizeInput.value = "";
    specialPrizeInput.style.display = "none";
  } else {
    displayText = `${prizeText.textContent}：${winner.dept} - ${winner.firstPart}${winner.restPart}`;
  };

  // 存入結果
  winnerData.push({
    dept: winner.dept,
    name: `${winner.firstPart}${winner.restPart}`,
    prize: prizeText.textContent,
    bonus: bonusText
  });
  updateCounts();

  // 顯示中獎名單
  const li = document.createElement('li');
  li.dataset.key = `${winner.dept}-${winner.firstPart}${winner.restPart}`;
  li.innerHTML = `${displayText}${bonusText ? '（加碼：' + bonusText + '）' : ''}<span class="remove-btn" style="cursor:pointer;color:red;margin-left:10px;">✖</span>`;
  winnerLists.forEach(list => list.insertBefore(li.cloneNode(true), list.firstChild));

  showWinnerEffect();
};

// 清除中獎者
winnerLists.forEach(list => {
  list.addEventListener('click', e => {
    if (!e.target.classList.contains('remove-btn')) return;

    const li = e.target.closest('li');
    if (!li) return;

    const key = li.dataset.key;

    // ======== 啟動「刪除確認 Toast」 ========
    const confirmBody = document.querySelector('#confirm-toast-body');
    confirmBody.innerHTML  = `<p>確定要移除<span class="text-danger">${key}</span>嗎？移除後會回到抽獎名單內。</p>`;

    const confirmToastEl = document.querySelector('#confirm-toast');
    const confirmToast = new bootstrap.Toast(confirmToastEl);
    confirmToast.show();

    const yesBtn = document.querySelector('#confirm-yes');
    const noBtn = document.querySelector('#confirm-no');

    const cleanup = () => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
      cleanup();
      confirmToast.hide();

      // 實際刪除作業
      drawnWinners.delete(key);
      winnerData = winnerData.filter(w => `${w.dept}-${w.name}` !== key);

      winnerLists.forEach(l => {
        const removeLi = l.querySelector(`li[data-key="${key}"]`);
        if (removeLi) removeLi.remove();
      });

      updateCounts();

      // ===== 顯示成功 Toast =====
      const successBody = document.getElementById("success-toast-body");
      successBody.innerHTML = `<p><span class="text-danger">${key}</span>已從中獎名單移除，可以再次抽到</p>`;

      const successToastEl = document.getElementById("success-toast");
      const successToast = new bootstrap.Toast(successToastEl);
      successToast.show();
    };

    // === 按下「取消」 ===
    noBtn.onclick = () => {
      cleanup();
      confirmToast.hide();
    };
  });
});

//同步抓取前後端資料
function updateCounts() {
  const total = allNames.length;
  const win = drawnWinners.size;
  const remain = total - win;

  document.querySelector('#total-count').textContent = total;
  document.querySelector('#win-count').textContent = win;
  document.querySelector('#remain-count').textContent = remain;
};

//淡出彈入動畫

async function playPrizeAnimation() {
  const panel = document.querySelector('.animate__animated');

  panel.classList.remove(
    'animate__headShake',
    'animate__flash',
    'glitch-effect'
  );

  function playAnimation(animName) {
    return new Promise(resolve => {
      panel.classList.remove(animName);
      void panel.offsetWidth;
      panel.classList.add(animName);
      panel.addEventListener('animationend', () => {
        panel.classList.remove(animName);
        resolve();
      }, { once: true });
    });
  };

  const displayText = panel.textContent;
  panel.setAttribute('data-text', displayText);

  panel.classList.remove('animate__headShake', 'animate__flash', 'glitch-tv');
 // 2.TV 故障效果（2 秒）
  panel.classList.add("glitch-tv");
  await new Promise(resolve => setTimeout(resolve, 2000 + 3000)); // 2秒動畫 + 4秒停留
  panel.classList.remove("glitch-tv");

  // 3. 讓元素消失
  panel.style.visibility = 'hidden';

  // 4. 停 4 秒
  await new Promise(resolve => setTimeout(resolve, 4000));

  // 5. 出現 + flash
  panel.style.visibility = '';
  await playAnimation('animate__flash');
};


//凍結特效+淡出彈入動畫
async function freezeMidAnimation() {
  // 淡出動畫
  await playPrizeAnimation(); // zoomOut + 3 秒停
  reels.forEach(r => r.el.style.transition = "");
};

let handAnim = lottie.loadAnimation({
  container: document.getElementById('hand-animation-container'),
  renderer: 'svg',
  loop: true,
  autoplay: false,   //不自動播放
  path: './Artboard1.json'
});
