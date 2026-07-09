"use client";

type UserGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function UserGuideModal({ open, onClose }: UserGuideModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
          <h2 id="guide-title" className="text-lg font-bold text-gray-900">
            사용방법
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900"
            aria-label="사용방법 닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 text-sm text-gray-700 space-y-4 leading-relaxed">
          <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">0. 시작 전에 먼저</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-gray-600">
              <li>브라우저에서 마이크 권한을 허용해 주세요.</li>
              <li>회의가 끝난 뒤에는 분석 버튼을 눌러야 요약/회의록이 만들어져요.</li>
              <li>결과를 다시 보고 싶으면 히스토리에서 같은 녹음을 선택하면 돼요.</li>
              <li>AI 분석 방식을 바꾸려면 ⚙️ 프롬프트 설정에서 고른 뒤 저장하기를 눌러 주세요.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900">1-1. 직접 녹음하기</h3>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>녹음 시작 버튼을 눌러요.</li>
              <li>회의가 끝나면 녹음을 종료해요.</li>
              <li>화면에 생긴 항목에서 AI 분석 버튼을 눌러요.</li>
              <li>잠시 기다리면 요약본과 상세 회의록이 자동으로 채워져요.</li>
            </ol>
            <p className="mt-2 text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2">
              마이크 녹음은 <strong>내 컴퓨터(localhost)</strong>나{" "}
              <strong>자물쇠가 있는 주소(HTTPS)</strong>에서만 돼요.{" "}
              <code className="text-xs">http://서버IP</code>로 접속하면
              브라우저가 마이크를 막아요. 그때는 아래{" "}
              <strong>1-2. 파일 올리기</strong>를 써 주세요.
            </p>
          </section>

          <section className="rounded-lg border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900">1-2. 녹음한 파일 올리기</h3>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>파일 업로드 버튼으로 녹음 파일을 선택해요.</li>
              <li>업로드가 끝나면 목록에 파일이 보여요.</li>
              <li>그 줄에서 AI 분석 버튼을 눌러 결과를 만들어요.</li>
              <li>이후에는 히스토리에서 AI 분석 불러오기로 다시 꺼내 볼 수 있어요.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900">1-3. 채팅창(메모창) 기능</h3>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>왼쪽 아래 입력칸에 중요한 말을 짧게 적어요.</li>
              <li>전송 버튼(종이비행기)을 누르면 메모가 말풍선처럼 쌓여요.</li>
              <li>이 메모는 AI가 요약할 때 참고해서 더 정확한 회의록을 만들어요.</li>
              <li>한 줄에 한 가지씩 적으면 나중에 읽기 쉬워요.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-violet-100 bg-violet-50 p-4">
            <h3 className="font-semibold text-gray-900">2. 프롬프트 저장 방법 (⚙️)</h3>
            <p className="mt-1 text-xs text-violet-900/90">
              AI가 요약·상세 회의록을 쓰는 방식(지시문)을 저장해 두는 기능이에요.
              <strong className="font-medium"> 로그인</strong>해야 서버에 목록이
              저장돼요. (비로그인은 이 기기에만 임시 저장)
            </p>

            <h4 className="mt-3 text-sm font-semibold text-gray-900">
              2-1. 설정 창 여는 법
            </h4>
            <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
              <li>화면 오른쪽 위 <strong>⚙️(톱니바퀴)</strong> 버튼을 눌러요.</li>
              <li>「AI 프롬프트 설정」창이 열리면 왼쪽에 저장된 목록이 보여요.</li>
            </ol>

            <h4 className="mt-3 text-sm font-semibold text-gray-900">
              2-2. 새 프롬프트 만들어 저장하기
            </h4>
            <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
              <li>왼쪽 위 <strong>새로 만들기</strong>를 눌러요.</li>
              <li>오른쪽에서 <strong>이름</strong>, <strong>요약 프롬프트</strong>,{" "}
                <strong>상세 회의록 프롬프트</strong>를 적어요.</li>
              <li>맨 아래 <strong>저장하기</strong>를 눌러요.</li>
              <li>
                초록색으로{" "}
                <strong>「저장되었습니다. AI 분석에 적용되었어요.»</strong>{" "}
                가 뜨고, 목록에 <strong>「사용 중」</strong>이 붙으면 성공이에요.
              </li>
            </ol>

            <h4 className="mt-3 text-sm font-semibold text-gray-900">
              2-3. 이미 있는 프롬프트 고쳐서 저장하기
            </h4>
            <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
              <li>왼쪽 목록에서 고칠 프롬프트를 눌러요. → <strong>「선택됨」</strong></li>
              <li>오른쪽 내용을 수정해요.</li>
              <li><strong>저장하기</strong>를 눌러요. → 서버에 저장 + <strong>「사용 중」</strong></li>
              <li>창은 그대로 열려 있어요. 확인 후 <strong>X</strong> 또는 <strong>취소</strong>로 닫으면 돼요.</li>
            </ol>

            <h4 className="mt-3 text-sm font-semibold text-gray-900">
              2-4. 다른 프롬프트 골라서 쓰기
            </h4>
            <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
              <li>목록에서 쓰고 싶은 프롬프트를 눌러요. (아직 <strong>선택됨</strong>만 표시)</li>
              <li>내용을 바꿀 필요 없으면 그대로 <strong>저장하기</strong>만 눌러요.</li>
              <li>그러면 그 프롬프트가 <strong>사용 중</strong>이 되고, 다음 AI 분석부터 적용돼요.</li>
            </ol>

            <p className="mt-3 text-xs text-violet-800/90 rounded-lg bg-violet-100/60 px-3 py-2">
              <strong>알아두면 좋아요</strong>
              <br />
              · 목록만 누르고 저장 안 하면 AI 분석 방식은 안 바뀌어요.
              <br />
              · <strong>삭제</strong>로 지울 수 있어요. (기본 프롬프트는 삭제 불가)
              <br />
              · 이미 쓰는 프롬프트와 내용이 같으면, 분석할 때 목록에 같은 이름이 또 생기지 않아요.
            </p>
          </section>

          <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="font-semibold text-gray-900">3. 이메일 전송 방법</h3>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-gray-700">
              <li>먼저 AI 분석이 끝났는지 확인해요.</li>
              <li>
                화면 아래쪽 이메일 영역에서 받는 사람·참조 주소를 적거나
                확인해요. (요약·회의록은 위쪽에 보여요.)
              </li>
              <li>오른쪽 위 전송(종이비행기) 버튼을 눌러요.</li>
              <li>전송이 끝나면 뜨는 안내 창을 확인해요.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <h3 className="font-semibold text-gray-900">자주 막히는 경우</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-amber-900">
              <li>목록이 비어 있으면 새로고침을 눌러 다시 불러와 보세요.</li>
              <li>분석 불러오기가 비활성화면, 그 녹음을 아직 분석하지 않은 상태예요.</li>
              <li>오류가 계속 뜨면 잠시 후 다시 시도하거나 인터넷 연결을 확인해 주세요.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
