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
const specialPrizeDropdown2  = document.querySelector('#special-prize-dropdown2');
const specialPrizeAmountInput = document.querySelector('#special-prize-amount-input');
const specialPrizeAmountList = document.querySelector('#special-prize-amount-list');



const winnerLists = [
  document.querySelector('#winner-list'),
  document.querySelector('#winner-list-mobile')
];

specialPrizeInput.addEventListener('focus', () => {
  buildWinnerDropdown(specialPrizeInput);
});

specialPrizeInput.addEventListener('input', e => {
  filterWinnerDropdown(e.target.value);
});

document.addEventListener('click', e => {
  if (!e.target.closest('#winner-dropdown') &&
      e.target !== specialPrizeInput) {
    document.getElementById('winner-dropdown').style.display = "none";
  }
});


// 1~8獎的固定金額
const prizeAmounts = {
  1: 35000,
  2: 34300,
  3: 32585,
  4: 30956,
  5: 23585,
  6: 15091,
  7: 8300,
  8: 3735
};



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
        const dept = row[0] != null ? String(row[0]).trim() : '';
        const id = row[1] != null ? String(row[1]).trim() : '';
        const name = row[2] != null ? String(row[2]).trim() : '';

        if (!dept || !name) return null;  // 只檢查部門和姓名
        return { dept, id, name };
      }).filter(Boolean);


      populateReels();
      startAutoScroll();
      updateCounts();
      populateSpecialPrizeList();
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
    `${w.dept} - ${w.name}`,
    w.prize,
    w.bonusSource,  //中獎來源
    w.prizeAmounts, //公司提供金額
    w.specialBonus, //加碼金額
    w.bonus2Source, //加碼來源
    w.balance
  ]);

  //加標題列
  const ws = XLSX.utils.aoa_to_sheet([['中獎人','獎項', '中獎來源','公司提供金額', '加碼金額','加碼來源','轉出金額']].concat(wsData));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '中獎名單');

  //下載 Excel
  XLSX.writeFile(wb, '大寶2026年尾牙中獎名單.xlsx');
});


function populateReels() {
  reels.forEach(r => {
  r.el.innerHTML = '';
  r.items = [];
  r.mapIndex = [];
});

  allNames.forEach((p, i) => {
    reels.forEach((r, reelIndex) => {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent = reelIndex === 0 ? p.dept : reelIndex === 1 ? p.id : p.name;
      r.el.appendChild(div);
      r.items.push(div);
      r.mapIndex.push(i); // mapIndex 直接對應 allNames 索引
    });
  });
};


function ensureReelLoop(reel, reelIndex) {
  const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
  const threshold = ITEM_HEIGHT * 3; // 提前3筆追加
  if (reel.position + viewportHeight > reel.items.length * ITEM_HEIGHT - threshold) {
    appendReelItems(reel.items.length);
  };
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
    specialPrizeAmountList.value = '';
    specialPrizeInput.value = '';
    specialPrizeInput2.value = '';
    if (value === "9") {
      specialPrizeContainer.style.display = "block";
      specialPrizeInput.style.display = "inline-block";
      specialPrizeInput2.style.display = "none";
      specialPrizeAmountInput.style.display = "block";
    } else if (value === "10"){
      specialPrizeContainer.style.display = "block";
      specialPrizeInput2.style.display = "inline-block";
      specialPrizeInput.style.display = "none";
      specialPrizeAmountInput.style.display = "block";
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
  const available = allNames.filter(p => !drawnWinners.has(`${p.dept}-${p.name}`));
  if (!available.length) {
    alert("所有人都已中獎！");
    return;
  };

  stopAutoScroll();
  isConfirming = true;
  const main = document.querySelector('.main');
  main.classList.add('active');

  // const hand = document.getElementById('hand-animation-container');
  // hand.style.display = 'block';
  // handAnim.goToAndPlay(0, true); // 從頭播放

  // **決定中獎者的地方,已平均隨機方式抽取一名
  const winner = available[Math.floor(Math.random() * available.length)];

  // **紀錄中獎者避免重複抽到
  drawnWinners.add(`${winner.dept}-${winner.name}`);

  // 原始名單索引
  const winnerIndex = allNames.findIndex(p => p.dept === winner.dept && p.name === winner.name);

  // 每軸對應 reel.items 的索引
  const reelTargetIndexes = reels.map(r => winnerIndex);
  const prizeValue = parseInt(dropdownButton.dataset.value) || 1;
  const fullRounds = getFullRounds(prizeValue);

  const reelDurations = [
    800 + fullRounds * 200,
    800 + fullRounds * 200 + 3000,
    800 + fullRounds * 200 + 6000
  ];

  if (dropdownButton.dataset.value === "1") {
    const totalTime = 10000; // 10秒總時長
    const midAnimationTime = 1000; // 中間動畫 1 秒
    const firstHalfTime = 3500; // 第一段滾輪 3.5 秒
    const secondHalfTime = totalTime - midAnimationTime - firstHalfTime; // 第二段滾輪剩下 5.5 秒

    // 獎項1：分兩段滾輪 + 中間暫停動畫
    const halfRounds = Math.floor(fullRounds / 2);

    // 第一段滾輪：滾到距離中獎者還 3 格的位置（修正避免空白或消失）
    const preTargetIndexes = reels.map((r, i) => {
      const target = reelTargetIndexes[i];
      const fullLength = r.mapIndex.length;
      return (target - 3 + fullLength) % fullLength;
    });

      await Promise.all([
        spinReel(reels[0], preTargetIndexes[0], firstHalfTime, 0, halfRounds),
        spinReel(reels[1], preTargetIndexes[1], firstHalfTime, 0, halfRounds),
        spinReel(reels[2], preTargetIndexes[2], firstHalfTime, 0, halfRounds)
      ]);

    // 暫停 + 動畫（你的淡出/彈入/空白邏輯）
    await freezeMidAnimation(2000);

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
    populateSpecialPrizeList();

    setTimeout(() => {
      main.classList.remove('active');
      lever.classList.remove('no-glow');
      startAutoScroll();
      isConfirming = false;
      // 隱藏手動畫
      // const hand = document.getElementById('hand-animation-container');
      // hand.style.display = 'none';
      // handAnim.stop();
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
          // const hand = document.getElementById('hand-animation-container');
          // hand.style.display = 'none';
          // handAnim.stop();
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
      const targetPos = reelTargetIndex * ITEM_HEIGHT - centerOffset;
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
            const finalPos = ((targetPos % totalHeight) + totalHeight) % totalHeight;
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
  // 先移除所有舊的 highlight
  reels[i].items.forEach(item => item.classList.remove('winner-highlight'));

  // 找對應的 reelItemIndex
  let reelItemIndex = reels[i].mapIndex.indexOf(winnerIndex);

  // 如果找不到，先補足滾輪 items
  if (reelItemIndex === -1) {
    // append 新的 item 直到包含 winnerIndex
    appendReelItems(reels[i].items.length);
    // 再重新找一次
    reelItemIndex = reels[i].mapIndex.indexOf(winnerIndex);
  };

  // 最後安全檢查
  if (reelItemIndex >= 0 && reelItemIndex < reels[i].items.length) {
    reels[i].items[reelItemIndex].classList.add('winner-highlight');
  };
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

  const prizeValue = dropdownButton.dataset.value;
  const prizeName = prizeText.textContent;
  let companyPrizeValue = prizeAmounts[prizeValue] || 0;

  let prizeAmountsText = `${winner.dept} - ${winner.name}`;
  let bonusText = "";
  let bonus2Text = "";
  let specialBonusText = "";

  if (prizeValue === "9") {
    bonusText = specialPrizeInput.value?.trim() || "";
    companyPrizeValue = Number(specialPrizeAmountInput.value) || 0;
  } else if (prizeValue === "10") {
    bonus2Text = specialPrizeInput2.value?.trim() || "";
    specialBonusText = specialPrizeAmountInput.value
    ? `${Number(specialPrizeAmountInput.value).toLocaleString()}元`
    : "";
  };
  const companyPrizeAmount = companyPrizeValue
  ? `【金額：${companyPrizeValue.toLocaleString()}】`
  : "";
  let displayText = companyPrizeAmount
  ? `${prizeName}${companyPrizeAmount}：`
  : `${prizeName}`;

  const li = document.createElement('li');
    li.dataset.key = `${winner.dept}-${winner.name}`;

  // 判斷是否幸運分享獎
  if (prizeValue  === "9") {
    li.innerHTML = `
      <p>${displayText}${prizeAmountsText}</p>
      <p style="color:#D67158;">【${bonusText}-幸運分享】</p>
      <span class="remove-btn" style="cursor:pointer;color:red;">✖</span>
  `;
  } else if (prizeValue === "10") {
    li.innerHTML = `
      <p>${displayText}【金額：${specialBonusText}】：${prizeAmountsText}</p>
      <p style="color:#D67158;">【${bonus2Text}】</p>
      <span class="remove-btn" style="cursor:pointer;color:red;">✖</span>
  `;
  } else {
      li.innerHTML = `
      <p>${displayText}${prizeAmountsText}</p>
      <span class="remove-btn" style="cursor:pointer;color:red;">✖</span>
    `;
  };

  // **加入 winnerData**
  winnerData.push({
    dept: winner.dept,
    id: winner.id,
    name: winner.name,
    prize: prizeText.textContent,
    bonusSource: bonusText,
    prizeAmounts: companyPrizeValue,
    specialBonus: specialBonusText,
    bonus2Source: bonus2Text
  });

  winnerLists.forEach(list => list.insertBefore(li.cloneNode(true), list.firstChild));

  showWinnerEffect();
  updateCounts();
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

      li.remove();

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

async function playPrizeAnimation(midTime = 1000) { // 傳入中間動畫時間
  const panel = document.querySelector('.animate__animated');

  panel.classList.remove('animate__headShake', 'animate__flash', 'glitch-effect');

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
  }

  const displayText = panel.textContent;
  panel.setAttribute('data-text', displayText);

  // glitch-tv 效果縮短
  panel.classList.add("glitch-tv");
  await new Promise(resolve => setTimeout(resolve, midTime));
  panel.classList.remove("glitch-tv");

  // 縮短消失停留
  panel.style.visibility = 'hidden';
  await new Promise(resolve => setTimeout(resolve, 500));

  panel.style.visibility = '';
  await playAnimation('animate__flash');
};

// 凍結特效 + 淡出彈入動畫
async function freezeMidAnimation(midTime = 1000) {
  await playPrizeAnimation(midTime);
  reels.forEach(r => r.el.style.transition = "");
};


// let handAnim = lottie.loadAnimation({
//   container: document.getElementById('hand-animation-container'),
//   renderer: 'svg',
//   loop: true,
//   autoplay: false,   //不自動播放
//   path: './Artboard1.json'
// });

//中獎人選


function buildWinnerDropdown(inputEl) {
  const dropdown = document.getElementById('winner-dropdown');
  dropdown.innerHTML = "";

  if (!winnerData.length) {
    dropdown.style.display = "none";
    return;
  };

  winnerData.forEach(w => {
    const btn = document.createElement('button');
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action";
    btn.textContent = `${w.dept} - ${w.name}`;

    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      dropdown.style.display = "none";
    });

    dropdown.appendChild(btn);
  });

  dropdown.style.display = "block";
};

function filterWinnerDropdown(keyword) {
  const dropdown = document.getElementById('winner-dropdown');
  const items = dropdown.querySelectorAll('button');

  let hasVisible = false;

  items.forEach(item => {
    const match = item.textContent.includes(keyword);
    item.style.display = match ? "block" : "none";
    if (match) hasVisible = true;
  });

  dropdown.style.display = hasVisible ? "block" : "none";
};


//現金加碼

function populateSpecialPrizeList() {
  const datalist = document.getElementById('special-prize-list');
  datalist.innerHTML = "";


  // 可以選 allNames 或 winnerData
  allNames.forEach(p => {
    const option = document.createElement('option');
    option.value = `${p.dept} - ${p.name}`;
    datalist.appendChild(option);
  });
};


function populateSpecialPrizeList2() {
  specialPrizeInput2.addEventListener('input', () => {
    const keyword = specialPrizeInput2.value.trim().toLowerCase();
    specialPrizeDropdown2.innerHTML = '';

    if (!keyword) {
      specialPrizeDropdown2.style.display = 'none';
      return;
    };

    const filtered = allNames.filter(p => {
      const fullName = `${p.dept} - ${p.name}`.toLowerCase();
      return fullName.includes(keyword);
    });

    if (filtered.length === 0) {
      specialPrizeDropdown2.style.display = 'none';
      return;
    };

    filtered.forEach(p => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.textContent = `${p.dept} - ${p.name}`;
      div.style.cursor = 'pointer';

      div.addEventListener('click', () => {
        specialPrizeInput2.value = div.textContent;
        specialPrizeDropdown2.style.display = 'none';
      });

      specialPrizeDropdown2.appendChild(div);
    });

    const rect = specialPrizeInput2.getBoundingClientRect();
    specialPrizeDropdown2.style.top = rect.bottom + window.scrollY + 'px';
    specialPrizeDropdown2.style.left = rect.left + window.scrollX + 'px';
    specialPrizeDropdown2.style.width = rect.width + 'px';
    specialPrizeDropdown2.style.display = 'block';
  });

  // 點空白收起 dropdown
  document.addEventListener('click', e => {
    if (!specialPrizeDropdown2.contains(e.target) && e.target !== specialPrizeInput2) {
      specialPrizeDropdown2.style.display = 'none';
    };
  });
};

// 初始化呼叫
populateSpecialPrizeList2();


// 下拉金額
function populateSpecialPrizeAmountList() {
  const min = 2100;
  const max = 30000;
  const step = 500;
  specialPrizeAmountList.innerHTML = '';
  for (let i = min; i <= max; i += step) {
    const option = document.createElement('option');
    option.value = i;
    // option.textContent = i.toLocaleString() + ' 元';
    specialPrizeAmountList.appendChild(option);
  };
};
populateSpecialPrizeAmountList();

