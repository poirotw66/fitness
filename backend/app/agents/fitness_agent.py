from typing import TypedDict, Annotated, Sequence
import operator
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set in environment variables")


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: int
    extracted_data: dict


class FitnessAgent:
    def __init__(self):
        # Try gemini-2.0-flash-exp first, fallback to gemini-pro if not available
        try:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                google_api_key=GEMINI_API_KEY,
                temperature=0.7,
            )
        except:
            # Fallback to gemini-pro
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-pro",
                google_api_key=GEMINI_API_KEY,
                temperature=0.7,
            )
        self.graph = self._build_graph()

    def _build_graph(self):
        """Build the LangGraph agent graph"""
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("analyze", self._analyze_message)
        workflow.add_node("extract", self._extract_data)
        workflow.add_node("respond", self._generate_response)

        # Set entry point
        workflow.set_entry_point("analyze")

        # Add edges
        workflow.add_edge("analyze", "extract")
        workflow.add_edge("extract", "respond")
        workflow.add_edge("respond", END)

        return workflow.compile()

    def _analyze_message(self, state: AgentState) -> AgentState:
        """Analyze the user message to determine intent"""
        # This is a simple implementation - can be enhanced with more sophisticated intent detection
        return state

    def _extract_data(self, state: AgentState) -> AgentState:
        """Extract diet and exercise data from the conversation"""
        # Extract data using LLM
        last_message = state["messages"][-1].content if state["messages"] else ""
        
        extraction_prompt = f"""
        分析以下用戶訊息，提取飲食和運動資訊。如果訊息中包含飲食或運動資訊，請以 JSON 格式返回：
        {{
            "diet": {{
                "has_diet": true/false,
                "meal_type": "breakfast/lunch/dinner/snack",
                "food_name": "食物名稱",
                "calories": 數字,
                "protein": 數字,
                "carbs": 數字,
                "fat": 數字
            }},
            "exercise": {{
                "has_exercise": true/false,
                "exercise_type": "運動類型",
                "duration": 分鐘數,
                "calories_burned": 數字
            }}
        }}
        
        如果沒有相關資訊，返回 {{"diet": {{"has_diet": false}}, "exercise": {{"has_exercise": false}}}}
        
        用戶訊息：{last_message}
        """
        
        try:
            response = self.llm.invoke([HumanMessage(content=extraction_prompt)])
            # Parse response (simplified - in production, use proper JSON parsing)
            import json
            import re
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                extracted = json.loads(json_match.group())
                state["extracted_data"] = extracted
            else:
                state["extracted_data"] = {"diet": {"has_diet": False}, "exercise": {"has_exercise": False}}
        except Exception as e:
            print(f"Error extracting data: {e}")
            state["extracted_data"] = {"diet": {"has_diet": False}, "exercise": {"has_exercise": False}}
        
        return state

    def _generate_response(self, state: AgentState) -> AgentState:
        """Generate a response to the user"""
        # Build context for the LLM
        conversation_history = "\n".join([
            f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
            for msg in state["messages"][-10:]  # Last 10 messages for context
        ])
        
        system_prompt = """你是一個專業的健康管理 AI 助手。你的職責是：
1. 幫助用戶記錄飲食和運動
2. 提供健康、運動、飲食相關的建議
3. 分析用戶的數據並給出個性化建議
4. 回答健康相關問題

請用友善、專業的語氣回答用戶。"""
        
        prompt = f"""{system_prompt}

對話歷史：
{conversation_history}

請根據以上對話生成一個合適的回應。"""
        
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            state["messages"].append(AIMessage(content=response.content))
        except Exception as e:
            print(f"Error generating response: {e}")
            state["messages"].append(AIMessage(content="抱歉，我遇到了一些問題。請稍後再試。"))
        
        return state

    def process_message(self, message: str, user_id: int, conversation_history: list = None) -> dict:
        """Process a user message and return response with extracted data"""
        # Build initial state
        messages = [HumanMessage(content=message)]
        if conversation_history:
            # Add conversation history
            for msg in conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                else:
                    messages.append(AIMessage(content=msg["content"]))
        
        state = {
            "messages": messages,
            "user_id": user_id,
            "extracted_data": {}
        }
        
        # Run the graph
        final_state = self.graph.invoke(state)
        
        # Get the last assistant message
        assistant_messages = [msg for msg in final_state["messages"] if isinstance(msg, AIMessage)]
        response_text = assistant_messages[-1].content if assistant_messages else "抱歉，無法生成回應。"
        
        return {
            "response": response_text,
            "extracted_data": final_state.get("extracted_data", {})
        }


# Singleton instance
_fitness_agent = None


def get_fitness_agent() -> FitnessAgent:
    """Get the singleton FitnessAgent instance"""
    global _fitness_agent
    if _fitness_agent is None:
        _fitness_agent = FitnessAgent()
    return _fitness_agent

