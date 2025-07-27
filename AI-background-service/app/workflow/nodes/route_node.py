from unittest import result
from app.configs.model_config import Gemini
from app.prompts.base_prompt import BasePrompt
from app.models.state import State
from app.exceptions.chat_exception import InvalidInputException, ModelNotFoundException, ToolExecutionException
from langchain.schema.messages import AIMessage, HumanMessage, SystemMessage
from app.workflow.tools.chat_tools import Chat
from langchain_core.messages import AIMessage, ToolCall
from app.models.extract_param import SearchParams
import re
import json
import ast

class RouteNode:
    def __init__(self):
        try:
            self._gemini = Gemini()
            self._llm = self._gemini.llm()
            self._prompt = BasePrompt()
            self._chat = Chat()
            self._llm_bind_tools = self._chat.get_llm_binds_tools()
            self._tool_node = self._chat.get_tool_node()
        except Exception as e:
            raise ModelNotFoundException(f"Failed to initialize chat models: {str(e)}")

    @staticmethod
    def _ai_to_json(ai: AIMessage):
        if hasattr(ai, "content"):
            content = ai.content
        elif isinstance(ai, str):
            content = ai
        else:
            raise InvalidInputException("Invalid AI message format")

        content = re.sub(r"^```json\n|```$", "", content.strip(), flags=re.MULTILINE)
        
        print("AI Content:", content)

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise InvalidInputException(f"Failed to parse AI response as JSON: {str(e)}")
    
    @staticmethod
    def str_to_list_of_str(data_str):
        data = ast.literal_eval(data_str)
        return [str(item) for item in data]

    def route(self, state: State):
        messages = state.user_input

        decision = self._llm.invoke([
            SystemMessage(content=self._prompt.route_instructions),
            HumanMessage(content=messages),
        ])
        state.next_state = self._ai_to_json(decision).get("datasource")
        # print("Decision:", state["next_state"])

        # state["next_state"] = "tools" if decision.get("datasource") == "tools" else "generate"
        return state
    
    def using_tools(self, state: State):
        messages = state.user_input

        tool_prompt = self._prompt.using_tools_prompt.format(
            user_id=state.user_id
            , user_input=messages
        )

        if not messages or not isinstance(messages, str) or messages.strip() == "":
            raise ValueError("User input is empty or invalid. Please provide a valid input.")

        result = self._llm_bind_tools.invoke([
            SystemMessage(content=tool_prompt),
            HumanMessage(content=messages),
        ])

        print("Tool Result:", result)

        tool_call = result.tool_calls[0]
        tool_call['args']['state']['user_input'] = messages

        ai_msg = AIMessage(
            content=result.content,
            additional_kwargs=result.additional_kwargs,
            tool_calls=[tool_call]
        )

        if result.tool_calls:
            # state = 
            final_result = self._tool_node.invoke([ai_msg])
            print("Tool Result:", final_result)

            if(tool_call['name'] == "search_paintings_by_keyword"):
                # Chuyển đổi kết quả từ công cụ thành định dạng mong muốn
                convert_prompt = self._prompt.search_paintings_prompt.format(
                    tool_run=final_result,
                    question=messages,
                )
            elif(tool_call['name'] == "order_painting"):
                convert_prompt = self._prompt.order_prompt.format(
                    tool_run=final_result,
                    question=messages,
                )
            else:
                convert_prompt = self._prompt.coupon_prompt.format(
                    tool_run=final_result,
                    question=messages,
                )

            generation = self._llm.invoke([
                SystemMessage(content=convert_prompt),
                HumanMessage(content=messages),
            ])
            

            state.final_generation = generation.content

            
        state.next_state = "end"

        return state
    
    def generate(self, state: State):
        messages = state.user_input

        prompt_generation = self._prompt.generate_prompt.format(
            question=messages,
            history=state.chat_history,
        )

        generation = self._llm.invoke([
            SystemMessage(content=prompt_generation),
            HumanMessage(content=messages),
        ])

        state.final_generation = generation.content if isinstance(generation, AIMessage) else generation
        return state
    
    def order(self, state: State):
        messages = state.user_input

        order_instructions = self._prompt.order_instructions.format(
            history=[],
            question=messages,
        )

        generation = self._llm.invoke([
            SystemMessage(content=order_instructions),
            HumanMessage(content=messages),
        ])

        

        state.final_generation = generation.content if isinstance(generation, AIMessage) else generation
        return state