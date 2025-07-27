from app.configs.model_config import Gemini
from app.prompts.base_prompt import BasePrompt
from app.database import PostgresDatabase
from app.models.state import State
from app.exceptions.chat_exception import InvalidInputException, ModelNotFoundException, ToolExecutionException
from langchain.schema.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode
import json
from jinja2 import Template
from app.models.extract_param import SearchParams


class Chat:
    def __init__(self):
        self._db = PostgresDatabase()
        self._prompt = BasePrompt()
        self._model = Gemini()
        self._schema_extract = SearchParams()
        self._llm = self._model.llm()
        def extract_keywords(state: State):
            """
            Bước trích xuất từ khóa tìm kiếm từ user_input và lưu vào state.
            """

            print("User Input:", state.user_input)

            self._prompt.extract_keywords = self._prompt.extract_keywords.format(
                question=state.user_input,
            ) 


            model_with_structure = self._llm.with_structured_output(SearchParams)

            result = model_with_structure.invoke([
                SystemMessage(content=self._prompt.extract_keywords),
                HumanMessage(content=state.user_input),
            ])

            state.search_params = result

            return state
        
        def validate_category(self, category: str) -> bool:
            if not category:
                return True
            query = "SELECT 1 FROM categories WHERE category_code = %s AND is_active = true"
            return bool(self._db.run(query, (category,)))
        
        @tool
        def search_paintings_by_keyword(state: State):
            """
            Tìm kiếm tranh theo từ khóa, danh mục, giá và kích thước từ câu hỏi của người dùng.
            Trả về danh sách tranh phù hợp với các tiêu chí tìm kiếm.
            """
            print("Search Params:", state)
            state = extract_keywords(state)

            if not state.search_params:
                state.final_generation = "Không tìm thấy thông tin phù hợp với yêu cầu của bạn."
                return state

            search_params = state.search_params

            # Truy vấn SQL tối ưu hóa
            query_template = """
                SELECT p.*
                FROM paintings p
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE (
                    {{ 'true' if keyword is none else 'false' }}
                    OR EXISTS (
                        SELECT 1 FROM unnest(ARRAY{{ keyword }}) AS kw
                        WHERE p.name ILIKE '%' || kw || '%'
                        OR p.description ILIKE '%' || kw || '%'
                    )
                )
                AND ({{ 'true' if max_price is none else 'p.price <= ' + max_price|string }})
                AND ({{ 'true' if size is none else "p.size = '" ~ size ~ "'" }})
                AND ({{ 'true' if category is none else "c.category_code = '" ~ category ~ "'" }})
                ORDER BY p.created_at DESC
                LIMIT {{ limit }};
            """

            if search_params.category and not self.validate_category(search_params.category):
                search_params.category = None

            template = Template(query_template)
            query = template.render(
                keyword=search_params.keyword if search_params.keyword else None,
                max_price=search_params.max_price,
                size=search_params.size,
                category=search_params.category,
                limit=search_params.limit or 10
            )


            print("Query:", query)

            try:
                paintings = self._db.run(query)
                if not paintings:
                    state.final_generation = "Không tìm thấy tranh nào phù hợp với yêu cầu của bạn."
                    return state
                return paintings
            except Exception as e:
                state.final_generation = "Đã xảy ra lỗi khi tìm kiếm tranh. Vui lòng thử lại sau."
                state.error.append(str(e))
                return state

        
        @tool
        def get_order_instructions(state: State) -> State:
            """
            Tìm kiếm thông tin đơn hàng.
            """
            # chưa lấy được order_id từ state
            if (state.user_id is None):
               state.final_generation = "Vui lòng cung cấp ID người dùng để lấy thông tin đơn hàng."
            else:
                template_query = """
                    SELECT o.order_id, o.address_detail, o.city, o.contact, o.delivery_cost, 
                    o.discount, o.payment_method, o.order_date, o.postal_code, o.receiver_name,
                    o.status, o.total_price, o.total_paintings_price
                     FROM orders o
                    WHERE o.user_id = '{{ user_id }}'
                    ORDER by o.order_date DESC
                """

                template = Template(template_query)
                query = template.render(
                    user_id=state.user_id
                )
            
                try:
                    order_info = self._db.run(query)
                    if not order_info:
                        return "Không tìm thấy thông tin đơn hàng cho người dùng này."
                    else:
                        return order_info
                except Exception as e:
                    state.final_generation = "Đã xảy ra lỗi khi lấy thông tin đơn hàng."
                    state.error.append(str(e))

            return state

        @tool
        def get_coupons_available(state: State) -> State:
            """
            Tìm kiếm thông tin khuyến mãi hiện có.
            """
            
            
            template_query = """
                SELECT c.code, c.description, c.discount_percentage, c.start_date, c.end_date, c.image_url
                FROM coupons c
                WHERE c.is_active = true
                AND c.is_public = true
                AND c.start_date <= NOW()
                AND c.end_date >= NOW()
                ORDER BY c.end_date ASC
            """
            
            try:
                get_coupons_available = self._db.run(template_query)
                if not get_coupons_available:
                    return "Hiện tại không có khuyến mãi nào."
                else:
                    return get_coupons_available
            except Exception as e:
                state.final_generation = "Đã xảy ra lỗi khi lấy thông tin khuyến mãi."
                state.error.append(str(e))

            return state
        
        @tool
        def get_category_available(state: State) -> State:
            """
            Tìm kiếm thông tin các loại tranh, danh mục hiện có.
            """  
            
            template_query = """
                SELECT c.category_id, c.description, c.image_url, c.name, c.category_code
                FROM categories c
                WHERE c.is_active = true
                ORDER BY c.created_at ASC
            """
            
            try:
                get_category_available = self._db.run(template_query)
                if not get_category_available:
                    return "Hiện tại không có danh mục nào."
                else:
                    return get_category_available
            except Exception as e:
                state.final_generation = "Đã xảy ra lỗi khi lấy thông tin danh mục."
                state.error.append(str(e))

            return state

        self._tools = [search_paintings_by_keyword, get_order_instructions, get_coupons_available, get_category_available]
        self._tool_node = ToolNode(self._tools)
        self.test_tools = search_paintings_by_keyword

        self._llm_binds_tools = self._llm.bind_tools(self._tools)
    
    def get_llm_binds_tools(self):
        return self._llm_binds_tools

    def get_tool_node(self):
        return self._tool_node

    def get_llm(self):
        return self._llm
    
    
    
    

# if __name__ == "__main__":
#     chat = Chat()
#     chat.test_connection()
