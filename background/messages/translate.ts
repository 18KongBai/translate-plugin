const handler = async (req, res) => {
  const { body } = req // 从请求中获取数据
  console.log("Background received:", body)

  try {
    const { text, apiConfig } = body
    
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error("缺少API密钥配置")
    }

    // 使用配置中的API URL或默认URL
    const apiUrl = apiConfig.apiUrl || "https://api.deepseek.com/v1/chat/completions";

    // 检测文本语言
    const isChineseText = /[\u4e00-\u9fa5]/.test(text);
    
    const systemPrompt = isChineseText 
      ? "你是一个专业的翻译助手。请将用户提供的中文文本翻译成英文，保持文本的原意和语气。只返回翻译结果，不需要解释。请以JSON格式输出，格式为：{\"translation\": \"翻译后的文本\"}"
      : "你是一个专业的翻译助手。请将用户提供的文本翻译成中文，保持文本的原意和语气。只返回翻译结果，不需要解释。请以JSON格式输出，格式为：{\"translation\": \"翻译后的文本\"}";

    console.log(`使用系统提示: ${systemPrompt}`);
    console.log(`翻译文本: ${text}`);
    console.log(`识别为中文: ${isChineseText}`);
    console.log(`模型: ${apiConfig.model || "deepseek-chat"}`);

    // 调用DeepSeek API进行翻译
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model || "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        // 使用新特性，强制输出JSON格式
        response_format: {
          type: "json_object"
        },
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API响应错误:", errorData);
      throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("API响应数据:", data);
    
    let translatedText = "";
    
    try {
      // 获取assistant返回的内容 
      if (
        data &&
        data.choices && 
        data.choices.length > 0 && 
        data.choices[0].message && 
        data.choices[0].message.content
      ) {
        const content = data.choices[0].message.content.trim();
        console.log("API返回的内容:", content);
        
        // 尝试解析JSON
        try {
          const jsonResponse = JSON.parse(content);
          // 检查是否包含translation字段
          if (jsonResponse && jsonResponse.translation) {
            translatedText = jsonResponse.translation;
          } else {
            // 如果没有translation字段，直接使用内容
            translatedText = content;
          }
        } catch (jsonError) {
          console.warn("JSON解析失败，使用原始内容:", jsonError);
          translatedText = content;
        }
      } else {
        throw new Error("API返回数据格式不符合预期");
      }
    } catch (e) {
      console.error("处理翻译结果出错:", e);
      // 兜底方案
      if (data && data.choices && data.choices.length > 0) {
        translatedText = data.choices[0].message?.content || "获取翻译结果失败";
      } else {
        translatedText = "获取翻译结果失败";
      }
    }

    // 返回翻译结果给content script
    res.send({
      success: true,
      result: translatedText
    });
  } catch (error) {
    console.error("翻译出错:", error);
    res.send({
      success: false,
      error: error.message
    });
  }
}

export default handler
