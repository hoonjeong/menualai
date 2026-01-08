import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경 변수 또는 localStorage에서 API 키 가져오기
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const STORAGE_KEY = 'gemini_api_key';
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

// API 키 가져오기 (localStorage 우선)
function getApiKey(): string | null {
  const storedKey = localStorage.getItem(STORAGE_KEY);
  return storedKey || ENV_API_KEY || null;
}

// Gemini API 클라이언트 생성
function createClient(): GoogleGenerativeAI | null {
  const apiKey = getApiKey();
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
}

// 초기 클라이언트
let genAI = createClient();

// 시스템 프롬프트 - 경영/운영/서비스 매뉴얼 전문가
const SYSTEM_PROMPT = `# 1. 페르소나 (Persona)

역할: 경영, 운영, 서비스 매뉴얼 제작 및 비즈니스 표준화 전문가.

성격: 실용적이고 유연하며, 사업자의 운영 효율성을 최우선으로 생각하는 든든한 조력자.

목표: 기업, 학원, 요식업, 자영업 등 다양한 서비스 현장에서 즉시 활용 가능한 매뉴얼과 운영 노하우를 제공함.

# 2. 전문 분야 및 상담 범위 (Scope)

다음과 관련된 질문에 대해서만 전문적인 조언과 결과물을 제공합니다.

- 운영 표준화: 업무 프로세스 설계, SOP 작성, 개폐점 체크리스트.
- 서비스 품질: 고객 응대(CS) 가이드, 상황별 스크립트, 컴플레인 해결 프로세스.
- 조직 및 인사: 직원 채용/교육 매뉴얼, 직무 기술서, 조직 문화 가이드.
- 사업장 관리: 시설 관리, 안전/보안 매뉴얼, 리스크 관리 전략.

# 3. 답변 원칙 및 스타일

- 유연한 대응: 답변 포맷을 하나로 고정하지 않습니다. 사용자의 질문 의도와 상황에 따라 상세한 가이드라인, 대화형 조언, 혹은 간단한 요약 등 가장 적절한 형식을 선택하여 답변합니다.
- 현장 중심: 이론적인 설명보다는 실제 현장에서 발생할 수 있는 변수를 고려하여 실무적인 해결책을 제시합니다.
- 전문성 유지: 비즈니스 파트너로서 신뢰감 있고 명확한 언어를 사용합니다.
- 한국어로 응답합니다.

# 4. 제약 조건 (Hard Rule) - 반드시 준수

범위 외 응답 제한: 위 전문 분야(경영, 운영, 서비스, 매뉴얼, 레시피 등)와 관련이 없는 질문(예: 일상 대화, 연예, 일반 상식, 비즈니스와 무관한 개인적 질문 등)에 대해서는 어떠한 예외도 없이 "응답할 수 없는 질문입니다."라고만 답변합니다.

* 주의: "죄송하지만~"과 같은 부연 설명을 절대 붙이지 않고, 정해진 문구만 일관되게 출력합니다.`;

// 비즈니스 관련 키워드
const BUSINESS_KEYWORDS = [
  // 운영 표준화
  '매뉴얼', '가이드', '절차', '프로세스', 'SOP', '표준', '체크리스트',
  '개점', '폐점', '오픈', '마감', '업무', '운영',
  // 서비스 품질
  '고객', '응대', 'CS', '서비스', '컴플레인', '클레임', '스크립트',
  // 조직 및 인사
  '직원', '교육', '채용', '인사', '조직', '팀', '리더십', '직무',
  // 사업장 관리
  '시설', '안전', '보안', '관리', '리스크', '위생',
  // 일반 비즈니스
  '사업', '회사', '경영', '매장', '학원', '식당', '카페',
  '프랜차이즈', '창업', '자영업', '레시피', '메뉴',
  '재고', '주문', '배송', '품질', '효율', '생산성'
];

// 비즈니스 관련 질문인지 확인
function isBusinessRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return BUSINESS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

// 오프토픽 응답 (부연 설명 없이 일관된 문구만 출력)
const OFF_TOPIC_RESPONSE = `응답할 수 없는 질문입니다.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
}

// 대화 기록을 저장할 배열
let conversationHistory: ChatMessage[] = [];

/**
 * Gemini API를 사용하여 채팅 응답 생성
 */
export async function sendChatMessage(
  userMessage: string,
  context?: string
): Promise<ChatResponse> {
  // API 키 확인
  if (!genAI) {
    return {
      success: false,
      message: '',
      error: 'Gemini API 키가 설정되지 않았습니다. 환경 변수를 확인해 주세요.',
    };
  }

  try {
    // 비즈니스 관련 질문인지 간단히 확인 (첫 메시지이거나 명확히 오프토픽인 경우)
    const isFirstMessage = conversationHistory.length === 0;
    const messageLength = userMessage.trim().length;

    // 매우 짧은 인사나 간단한 질문은 허용
    const isSimpleGreeting = messageLength < 20 && /^(안녕|하이|헬로|hi|hello|네|응|좋아|감사|고마워)/i.test(userMessage);

    // 명확히 오프토픽인 경우에만 필터링 (비즈니스 키워드가 없고, 인사도 아니고, 대화 맥락도 없는 경우)
    if (!isSimpleGreeting && !isBusinessRelated(userMessage) && isFirstMessage) {
      return {
        success: true,
        message: OFF_TOPIC_RESPONSE,
      };
    }

    // 모델 가져오기
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // 프롬프트 구성
    let fullPrompt = SYSTEM_PROMPT + '\n\n';

    // 컨텍스트 추가 (현재 편집 중인 문서 등)
    if (context) {
      fullPrompt += `## 현재 작업 중인 문서 컨텍스트\n${context}\n\n`;
    }

    // 대화 기록 추가
    if (conversationHistory.length > 0) {
      fullPrompt += '## 이전 대화\n';
      conversationHistory.slice(-10).forEach((msg) => {
        fullPrompt += `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}\n`;
      });
      fullPrompt += '\n';
    }

    // 현재 질문 추가
    fullPrompt += `## 현재 질문\n사용자: ${userMessage}\n\n어시스턴트:`;

    // API 호출
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // 대화 기록에 추가
    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: text });

    // 대화 기록이 너무 길어지면 오래된 것 제거
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    return {
      success: true,
      message: text,
    };
  } catch (error) {
    console.error('Gemini API 오류:', error);

    // 에러 메시지 처리
    let errorMessage = 'AI 응답 생성 중 오류가 발생했습니다.';

    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        errorMessage = 'API 키가 유효하지 않습니다.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
      } else if (error.message.includes('network')) {
        errorMessage = '네트워크 연결을 확인해 주세요.';
      }
    }

    return {
      success: false,
      message: '',
      error: errorMessage,
    };
  }
}

/**
 * 대화 기록 초기화
 */
export function clearChatHistory(): void {
  conversationHistory = [];
}

/**
 * 대화 기록 가져오기
 */
export function getChatHistory(): ChatMessage[] {
  return [...conversationHistory];
}

/**
 * API 키 설정 여부 확인
 */
export function isApiKeyConfigured(): boolean {
  return !!getApiKey();
}

/**
 * API 키 설정
 */
export function setGeminiApiKey(apiKey: string): void {
  if (apiKey.trim()) {
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  // 클라이언트 재생성
  genAI = createClient();
}

/**
 * 현재 저장된 API 키 가져오기 (마스킹됨)
 */
export function getStoredApiKey(): string {
  const key = localStorage.getItem(STORAGE_KEY);
  if (!key) return '';
  // 앞 4자리만 보여주고 나머지는 마스킹
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
}

/**
 * API 키 삭제
 */
export function clearGeminiApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  genAI = createClient();
}

/**
 * API 키가 localStorage에 저장되어 있는지 확인
 */
export function hasStoredApiKey(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}
