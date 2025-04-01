import React, { useEffect, useState, useRef, forwardRef } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

/**
 * 定义内容脚本的配置，使插件在所有URL上生效
 */
export const config = {
  matches: ["<all_urls>"]
}

/**
 * 设置组件样式，确保组件在页面上正确显示
 * 高z-index确保翻译内容显示在页面元素之上
 */
export const getStyle = () => {
  return {
    zIndex: 99999,  // 确保足够高的z-index值
    position: "relative"
  }
}

/**
 * 设置插件锚点，将组件挂载到页面body上
 */
export const getInlineAnchor = async () => {
  return document.body
}

/**
 * 检测文本是否包含中文字符
 * @param {string} text - 需要检测的文本
 * @returns {boolean} - 是否包含中文
 */
const isChineseText = (text) => /[\u4e00-\u9fa5]/.test(text);

/**
 * 自定义折叠文本组件
 * 当文本过长时，提供展开/收起功能以优化显示
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.text - 要显示的文本
 * @param {number} props.maxRows - 折叠时显示的最大行数
 * @param {boolean} props.expanded - 是否展开
 * @param {Function} props.onToggle - 展开/收起状态变化时的回调
 */
const CollapsibleText = ({ text, maxRows = 3, expanded = false, onToggle }) => {
  const textRef = useRef(null);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);

  // 检测文本是否需要折叠
  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
      const height = textRef.current.scrollHeight;
      const lines = Math.ceil(height / (lineHeight || 20)); // 20px是默认行高
      setNeedsCollapse(lines > maxRows);
    }
  }, [text, maxRows]);

  // 当expanded属性变化时更新内部状态
  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  // 处理展开/收起切换
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (onToggle) {
      onToggle(!isExpanded);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={textRef}
        style={{
          overflow: needsCollapse && !isExpanded ? 'hidden' : 'visible',
          maxHeight: needsCollapse && !isExpanded ? `${maxRows * 1.5}em` : 'none',
          fontSize: '14px',
          lineHeight: '1.5',
          wordBreak: 'break-word'
        }}
      >
        {text}
      </div>
      {needsCollapse && (
        <div
          onClick={handleToggle}
          style={{
            marginTop: '4px',
            cursor: 'pointer',
            color: '#4285f4',
            fontSize: '12px',
            textAlign: 'center'
          }}
        >
          {isExpanded ? '收起' : '展开'}
        </div>
      )}
    </div>
  );
};

/**
 * 翻译结果弹窗组件
 * 显示原文和翻译结果，支持文本展开/收起，提供复制功能
 * 使用forwardRef以便父组件可以访问DOM元素
 */
const ResultPopup = forwardRef(({ 
  onClose, 
  selectedText, 
  translatedText, 
  isLoading, 
  error, 
  copied, 
  expandSource, 
  expandTranslation,
  setExpandSource,
  setExpandTranslation,
  copyTranslatedText
}, ref) => {
  const isChinese = isChineseText(selectedText);
  
  return (
    <div
      ref={ref}
      className="translate-popup"
      style={{
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 10000,
        maxWidth: "350px",
        minWidth: "250px",
        fontFamily: "Arial, sans-serif",
        color: "#333",
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased"
      }}
      onMouseDown={(e) => e.stopPropagation()}>
      {/* 原文区域 */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
          <strong>原文{selectedText.length > 50 ? `(${selectedText.length}字)` : ""}：</strong>
          <span style={{ fontSize: "12px", color: "#666" }}>
            检测为{isChinese ? "中文" : "非中文"}
          </span>
        </div>
        <div style={{ 
          padding: "5px",
          border: "1px solid #eee",
          borderRadius: "3px",
          backgroundColor: "#f9f9f9"
        }}>
          <CollapsibleText 
            text={selectedText} 
            maxRows={3} 
            expanded={expandSource}
            onToggle={setExpandSource}
          />
        </div>
      </div>
      {/* 翻译结果区域 */}
      <div>
        <strong>翻译{isChinese ? "(→英文)" : "(→中文)"}：</strong>
        {isLoading ? (
          // 加载中状态
          <div style={{ margin: "10px 0", textAlign: "center" }}>
            <p style={{ margin: "5px 0", color: "#666" }}>翻译中...</p>
            {selectedText.length > 300 && (
              <p style={{ fontSize: "12px", color: "#888" }}>文本较长，可能需要一点时间</p>
            )}
          </div>
        ) : error ? (
          // 错误状态
          <p style={{ margin: "5px 0", color: "red" }}>{error}</p>
        ) : (
          // 翻译结果
          <div>
            <div style={{ 
              padding: "5px",
              border: "1px solid #eee",
              borderRadius: "3px",
              backgroundColor: "#f9f9f9",
              marginTop: "5px"
            }}>
              <CollapsibleText 
                text={translatedText || "未获取到翻译结果"} 
                maxRows={3} 
                expanded={expandTranslation}
                onToggle={setExpandTranslation}
              />
            </div>
            {/* 复制按钮 */}
            {translatedText && (
              <div 
                onClick={copyTranslatedText}
                style={{
                  cursor: "pointer",
                  color: copied ? "#4CAF50" : "#4285f4",
                  fontSize: "12px",
                  marginTop: "8px",
                  textAlign: "right",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "5px"
                }}>
                {copied ? "已复制 ✓" : "复制结果"}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          transition: "background-color 0.2s",
          zIndex: 10001 // 确保关闭按钮在最上层
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f0f0f0";
          const paths = e.currentTarget.querySelectorAll("path");
          paths.forEach(path => {
            path.setAttribute("fill", "#666666");
          });
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          const paths = e.currentTarget.querySelectorAll("path");
          paths.forEach(path => {
            path.setAttribute("fill", "#999999");
          });
        }}>
        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M512 860.40381a353.52381 353.52381 0 1 1 353.52381-353.52381 353.52381 353.52381 0 0 1-353.52381 353.52381z m0-658.285715a304.761905 304.761905 0 1 0 304.761905 304.761905 304.761905 304.761905 0 0 0-304.761905-304.761905z" fill="#999999" />
          <path d="M354.255238 630.186667l281.100191-281.112381 34.474666 34.499047-281.10019 281.088z" fill="#999999" />
          <path d="M354.255238 383.646476l34.474667-34.474666 281.112381 281.10019-34.499048 34.474667z" fill="#999999" />
        </svg>
      </button>
    </div>
  );
});

/**
 * 可拖动容器组件
 * 为内部组件提供拖拽功能，允许用户调整组件位置
 * 
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @param {Object} props.initialPosition - 初始位置 {x, y}
 * @param {Function} props.onPositionChange - 位置变化时的回调
 */
const DraggableBox = ({ children, initialPosition, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const dragRef = useRef(null);
  const dragStarted = useRef(false);

  // 当初始位置变化时更新位置
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  /**
   * 处理鼠标按下事件，开始拖动
   * 只有点击标题栏区域才触发拖动
   */
  const handleMouseDown = (e) => {
    // 只有点击标题栏才可拖动
    const rect = dragRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    if (clickY < 30) {
      e.preventDefault();
      e.stopPropagation();
      
      dragStarted.current = true;
      
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      // 开始拖动状态
      setIsDragging(true);
      
      /**
       * 全局鼠标移动处理
       * 根据鼠标位置计算并更新组件位置
       */
      const handleGlobalMouseMove = (moveEvent) => {
        if (!dragStarted.current) return;
        
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        
        const newX = moveEvent.clientX - offsetX;
        const newY = moveEvent.clientY - offsetY;
        
        setPosition({ x: newX, y: newY });
        if (onPositionChange) {
          onPositionChange({ x: newX, y: newY });
        }
      };
      
      /**
       * 全局鼠标抬起处理
       * 结束拖动状态，移除事件监听
       */
      const handleGlobalMouseUp = (upEvent) => {
        // 取消全局事件监听
        window.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
        window.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
        
        dragStarted.current = false;
        setIsDragging(false);
      };
      
      // 添加全局事件监听
      window.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
      window.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    }
  };

  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 标题栏 - 可拖动区域 */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '5px 8px',
        paddingRight: '25px', // 为关闭按钮留出空间
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        borderBottom: '1px solid #ddd',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#666',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ marginRight: '10px' }}>DeepSeek 翻译</span>
        <span style={{ 
          fontSize: '10px', 
          color: '#999', 
        }}>可拖动此处调整位置</span>
      </div>
      {children}
    </div>
  );
};

/**
 * 主翻译组件
 * 监听页面选中文本，提供翻译按钮和翻译结果弹窗
 * 
 * 优化建议：
 * 1. 性能优化: 使用React.memo包装子组件以避免不必要的重渲染
 * 2. 功能增强: 添加翻译历史记录功能，方便用户查看之前的翻译结果
 * 3. 交互优化: 支持键盘快捷键操作，如Esc关闭弹窗、Ctrl+C复制结果等
 * 4. 错误处理: 增强API错误处理，提供更友好的错误提示和重试机制
 * 5. 主题支持: 添加深色模式支持，根据系统或用户设置自动切换
 * 6. 可访问性: 改进组件的ARIA属性支持，使其对屏幕阅读器更友好
 * 7. 国际化: 将界面文本抽取为配置，支持多语言切换
 * 8. 存储优化: 减少状态数量，将相关状态合并为对象减少重渲染
 */
export default function TranslateContent() {
  // 状态管理
  const [isButtonVisible, setIsButtonVisible] = useState(false) // 翻译按钮可见性
  const [isResultVisible, setIsResultVisible] = useState(false) // 翻译结果可见性
  const [selectedText, setSelectedText] = useState("") // 选中的文本
  const [position, setPosition] = useState({ x: 0, y: 0 }) // 弹窗位置
  const [translatedText, setTranslatedText] = useState("") // 翻译结果
  const [isLoading, setIsLoading] = useState(false) // 加载状态
  const [error, setError] = useState(null) // 错误信息
  const [isTranslating, setIsTranslating] = useState(false) // 翻译进行中状态
  const [copied, setCopied] = useState(false) // 复制状态
  const [expandSource, setExpandSource] = useState(false) // 原文展开状态
  const [expandTranslation, setExpandTranslation] = useState(false) // 翻译结果展开状态
  
  // 引用管理
  const buttonRef = useRef(null) // 按钮DOM引用
  const popupRef = useRef(null) // 弹窗DOM引用
  const isOutsideClickProcessing = useRef(false) // 防止重复处理点击事件

  // 从Storage获取API配置
  const [apiConfig] = useStorage("data")
  
  // 检查翻译功能是否启用
  const isTranslateEnabled = apiConfig?.enabled !== false; // 默认为启用状态
  
  /**
   * 处理文本选择事件
   * 当用户选中文本时，显示翻译按钮
   */
  const handleSelection = (e) => {
    // 如果翻译功能被禁用，直接返回
    if (!isTranslateEnabled) {
      return;
    }
    
    // 如果正在执行翻译操作，跳过此处理
    if (isTranslating) {
      return
    }
    
    // 检查点击事件是否发生在翻译按钮或结果弹窗上
    if (e.type === "mouseup") {
      const path = e.composedPath ? e.composedPath() : e.path || []
      if (
        (buttonRef.current && path.includes(buttonRef.current)) ||
        (popupRef.current && path.includes(popupRef.current))
      ) {
        // 点击了翻译组件，不处理选择
        return
      }
    }
    
    const selection = window.getSelection()
    const text = selection.toString().trim()

    if (text && text.length > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // 设置按钮位置在选中文本下方
      setPosition({
        x: rect.left,
        y: rect.bottom + 5
      })
      setSelectedText(text)
      setIsButtonVisible(true)
    } else if (text.length === 0) {
      // 如果没有选中文本且不在翻译过程中，隐藏按钮
      setIsButtonVisible(false)
    }
  }

  /**
   * 处理外部点击事件
   * 仅在特定条件下隐藏翻译按钮，弹窗只能通过关闭按钮关闭
   */
  const handleClickOutside = (e) => {
    // 如果翻译功能被禁用，直接返回
    if (!isTranslateEnabled) {
      return;
    }
    
    if (isOutsideClickProcessing.current) return;
    isOutsideClickProcessing.current = true;
    
    try {
      // 只处理按钮的隐藏，不处理结果弹窗的隐藏
      // 获取事件路径并检查是否点击在按钮上
      const composedPath = e.composedPath ? e.composedPath() : e.path || [];
      const clickedOnButton = buttonRef.current && composedPath.some(el => el === buttonRef.current);
      
      // 如果点击了翻译按钮，不执行后续代码
      if (clickedOnButton) {
        return;
      }
      
      // 如果没有选中文本，并且不在翻译中，则隐藏按钮
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length === 0 && !isTranslating && !isResultVisible) {
        requestAnimationFrame(() => {
          setIsButtonVisible(false);
        });
      }
    } finally {
      // 确保在100ms后重置处理标志，防止可能的死锁
      setTimeout(() => {
        isOutsideClickProcessing.current = false;
      }, 100);
    }
  };

  // 添加和移除事件监听器
  useEffect(() => {
    console.log("翻译内容脚本已加载", isTranslateEnabled ? "翻译功能已启用" : "翻译功能已禁用")

    // 只有在翻译功能启用时才添加事件监听
    if (isTranslateEnabled) {
      document.addEventListener("mouseup", handleSelection)
      document.addEventListener("mousedown", handleClickOutside, { capture: true })
      
      // 清理函数
      return () => {
        document.removeEventListener("mouseup", handleSelection)
        document.removeEventListener("mousedown", handleClickOutside, { capture: true })
      }
    } else {
      // 如果翻译功能被禁用，确保清除所有状态
      setIsButtonVisible(false);
      setIsResultVisible(false);
      setIsTranslating(false);
    }
  }, [isTranslating, isResultVisible, isTranslateEnabled])

  // 如果翻译功能被禁用，不渲染任何内容
  if (!isTranslateEnabled) return null;

  /**
   * 更新弹窗位置
   * 当用户拖动弹窗时调用
   */
  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
  };

  /**
   * 发送翻译请求
   * 通过background脚本调用翻译API
   */
  const translateText = async (text) => {
    setIsLoading(true)
    setError(null)
    setCopied(false)

    try {
      // 发送翻译请求到background脚本
      const resp = await sendToBackground({
        name: "translate",
        body: {
          text: text,
          apiConfig: apiConfig
        }
      })

      if (resp.error) {
        throw new Error(resp.error)
      }

      if (resp.result) {
        setTranslatedText(resp.result)
      } else {
        throw new Error("未能获取到翻译结果")
      }
    } catch (err) {
      setError(`翻译失败: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 处理翻译按钮点击
   * 显示结果弹窗并发起翻译请求
   */
  const handleTranslate = async (e) => {
    e.stopPropagation()
    e.preventDefault()

    // 设置正在翻译状态，防止handleSelection处理
    setIsTranslating(true)
    
    // 先显示结果弹窗，再进行翻译
    setIsButtonVisible(false)
    setIsResultVisible(true)

    // 调用翻译API
    await translateText(selectedText)
  }

  /**
   * 复制翻译结果到剪贴板
   */
  const copyTranslatedText = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        (err) => {
          console.error("复制失败:", err);
        }
      );
    }
  };

  /**
   * 关闭翻译结果弹窗
   * 重置所有相关状态
   */
  const closeResult = (e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setIsResultVisible(false)
    setTranslatedText("")
    setError(null)
    setIsTranslating(false)
    setCopied(false)
    setExpandSource(false)
    setExpandTranslation(false)
  }

  // 如果两者都不显示，不渲染任何内容
  if (!isButtonVisible && !isResultVisible) return null

  // 检测语言，显示对应的按钮文本
  const isChinese = isChineseText(selectedText);
  const buttonText = isChinese ? "翻译为英文" : "翻译为中文";

  return (
    <>
      {/* 翻译按钮 */}
      {isButtonVisible && (
        <div
          ref={buttonRef}
          className="translate-button"
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            backgroundColor: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "5px 10px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            zIndex: 10000,
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "Arial, sans-serif",
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased"
          }}
          onClick={(e) => handleTranslate(e)}>
          <span>{buttonText}</span>
          {selectedText.length > 200 && (
            <span style={{ fontSize: "12px" }}>({selectedText.length}字)</span>
          )}
        </div>
      )}

      {/* 翻译结果弹窗 */}
      {isResultVisible && (
        <DraggableBox
          initialPosition={position}
          onPositionChange={handlePositionChange}
        >
          <ResultPopup
            ref={popupRef}
            onClose={closeResult}
            selectedText={selectedText}
            translatedText={translatedText}
            isLoading={isLoading}
            error={error}
            copied={copied}
            expandSource={expandSource}
            expandTranslation={expandTranslation}
            setExpandSource={setExpandSource}
            setExpandTranslation={setExpandTranslation}
            copyTranslatedText={copyTranslatedText}
          />
        </DraggableBox>
      )}
    </>
  )
}
