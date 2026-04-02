// 이 파일은 탭 클릭 시 상태를 변경하는 모든 로직을 담당합니다.

// 1) DOM에서 탭 버튼과 패널 요소를 가져옵니다.
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

// 2) 각 탭에 클릭 이벤트를 등록합니다.
// if문 말고 for문이 있다.
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab; // data-tab 값: "a" 또는 "b"

    // 2-1) 모든 탭에서 active 제거
    tabs.forEach((tabAct) => tabAct.classList.remove("active"));

    // 2-2) 클릭한 탭에만 active 추가
    tab.classList.add("active");

    // 2-3) 모든 패널에서 active 제거 후, 해당되는 것만 활성화
    panels.forEach((panel) => {
      if (panel.dataset.tab === target) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });
  });
});