import React, { useState, useEffect } from 'react';
import './App.css';

// Available models configuration
const models = [
  { id: 'gemma', name: 'Gemma', color: '#4285F4' },
  { id: 'llama2', name: 'LLaMA 2', color: '#34A853' },
  { id: 'mistral', name: 'Mistral', color: '#EA4335' }
];

// API service for model interaction
const fetchModelResponse = async (model, prompt) => {
  try {
    // Use AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(`http://localhost:8080/api/prompt/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    console.error(`Error with ${model}:`, error);
    throw error;
  }
};

function App() {
  // State management
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [responseOrder, setResponseOrder] = useState([]);
  const [modelStats, setModelStats] = useState({});
  const [promptHistory, setPromptHistory] = useState([]);
  const [activeMode, setActiveMode] = useState('compare'); // 'compare' or 'chat'
  const [activeModel, setActiveModel] = useState('gemma');
  const [chatHistory, setChatHistory] = useState({});
  const [comparisonResults, setComparisonResults] = useState(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('promptHistory');
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory));
    }

    const savedChatHistory = localStorage.getItem('chatHistory');
    if (savedChatHistory) {
      setChatHistory(JSON.parse(savedChatHistory));
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('promptHistory', JSON.stringify(promptHistory));
  }, [promptHistory]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Initialize chat history for models
  useEffect(() => {
    const initialChatHistory = {};
    models.forEach(model => {
      if (!chatHistory[model.id]) {
        initialChatHistory[model.id] = [];
      }
    });
    
    if (Object.keys(initialChatHistory).length > 0) {
      setChatHistory(prev => ({ ...prev, ...initialChatHistory }));
    }
  }, []);

  // Calculate comparison metrics whenever modelStats changes
  useEffect(() => {
    if (Object.keys(modelStats).length === models.length) {
      const comparison = analyzePerformance(modelStats);
      setComparisonResults(comparison);
    }
  }, [modelStats]);

  // Handle running prompts on all models in parallel
  const handleRunAll = async () => {
    if (!sharedPrompt.trim()) return;

    // Update prompt history (no duplicates, limit to last 10)
    const newHistory = [sharedPrompt, ...promptHistory.filter(p => p !== sharedPrompt)];
    setPromptHistory(newHistory.slice(0, 10));
    
    // Reset previous response order and comparison results
    setResponseOrder([]);
    setComparisonResults(null);
    
    // Clear previous responses
    setResponses({});
    setModelStats({});
    
    // Mark all models as loading
    const initialLoading = {};
    models.forEach(model => {
      initialLoading[model.id] = true;
    });
    setLoading(initialLoading);
    
    // Process each model INDEPENDENTLY using Promise.all to run in parallel
    // Each promise handles its own timing independently
    Promise.all(
      models.map(model => {
        return new Promise(async (resolve) => {
          try {
            const startTime = performance.now();
            
            // Initialize response to show loading
            setResponses(prev => ({ ...prev, [model.id]: "Processing..." }));
            
            // Make the API request
            const response = await fetchModelResponse(model.id, sharedPrompt);
            
            const endTime = performance.now();
            const timeTaken = Math.round(endTime - startTime);
            
            // Ensure we have valid values
            const tokensUsed = response.tokensUsed > 0 
              ? response.tokensUsed 
              : Math.max(1, Math.floor(response.text.length / 4));
            
            const responseLength = response.text ? response.text.length : 0;
            
            // Calculate token processing speed (avoid division by zero)
            const averageTokenTime = tokensUsed > 0 
              ? timeTaken / tokensUsed 
              : 0;
            
            // Update responses with the model's output
            setResponses(prev => ({ ...prev, [model.id]: response.text }));
            
            // Store performance metrics
            const stats = {
              timeTaken,
              tokensUsed,
              responseLength,
              averageTokenTime
            };
            
            setModelStats(prev => ({ ...prev, [model.id]: stats }));
            
            // Track response order for display
            setResponseOrder(prev => {
              // Only add if not already there
              if (!prev.includes(model.id)) {
                return [...prev, model.id];
              }
              return prev;
            });
            
            resolve();
          } catch (error) {
            // Handle errors
            const errorMessage = `Error: ${error.message || 'Failed to get response'}`;
            
            setResponses(prev => ({ ...prev, [model.id]: errorMessage }));
            
            setModelStats(prev => ({ 
              ...prev, 
              [model.id]: {
                timeTaken: 0,
                tokensUsed: 0,
                responseLength: errorMessage.length,
                averageTokenTime: 0
              }
            }));
            
            resolve(); // Resolve even on error
          } finally {
            // Mark as not loading
            setLoading(prev => ({ ...prev, [model.id]: false }));
          }
        });
      })
    );
  };

  // Send message in chat mode
  const handleChatSend = async () => {
    if (!sharedPrompt.trim()) return;
    
    // Add user message to chat history
    setChatHistory(prev => ({
      ...prev,
      [activeModel]: [
        ...prev[activeModel], 
        { role: 'user', content: sharedPrompt }
      ]
    }));

    setLoading(prev => ({ ...prev, [activeModel]: true }));
    
    // Prepare context from past messages (last 10 messages only for context window management)
    const recentMessages = chatHistory[activeModel].slice(-10);
    const context = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
      
    const fullPrompt = `${context}\nuser: ${sharedPrompt}\nassistant:`;
    
    try {
      const startTime = performance.now();
      const response = await fetchModelResponse(activeModel, fullPrompt);
      const endTime = performance.now();
      
      // Add assistant response to chat history
      setChatHistory(prev => ({
        ...prev,
        [activeModel]: [
          ...prev[activeModel],
          { role: 'assistant', content: response.text }
        ]
      }));
      
      // Update stats for the chat model
      const timeTaken = Math.round(endTime - startTime);
      const tokensUsed = response.tokensUsed > 0 ? response.tokensUsed : Math.floor(response.text.length / 4);
      
      setModelStats(prev => ({
        ...prev,
        [activeModel]: {
          timeTaken,
          tokensUsed,
          responseLength: response.text.length,
          averageTokenTime: tokensUsed > 0 ? timeTaken / tokensUsed : 0
        }
      }));
      
    } catch (error) {
      // Add error message to chat history
      setChatHistory(prev => ({
        ...prev,
        [activeModel]: [
          ...prev[activeModel],
          { role: 'system', content: `Error: ${error.message}` }
        ]
      }));
    } finally {
      setLoading(prev => ({ ...prev, [activeModel]: false }));
      setSharedPrompt('');
    }
  };

  // Analyze and compare model performance
  const analyzePerformance = (stats) => {
    if (Object.keys(stats).length < models.length) return null;

    // Find fastest and most efficient model
    let fastest = { id: null, time: Infinity };
    let mostEfficient = { id: null, tokenTime: Infinity };
    let leastTokens = { id: null, tokens: Infinity };

    Object.entries(stats).forEach(([modelId, modelStats]) => {
      // Check for fastest response time
      if (modelStats.timeTaken < fastest.time) {
        fastest = { id: modelId, time: modelStats.timeTaken };
      }
      
      // Check for most efficient token processing
      if (modelStats.averageTokenTime < mostEfficient.tokenTime) {
        mostEfficient = { id: modelId, tokenTime: modelStats.averageTokenTime };
      }
      
      // Check for token efficiency
      if (modelStats.tokensUsed < leastTokens.tokens && modelStats.tokensUsed > 0) {
        leastTokens = { id: modelId, tokens: modelStats.tokensUsed };
      }
    });

    // Determine overall best model using a scoring system
    const modelScores = {};
    
    models.forEach(model => {
      const modelId = model.id;
      const modelData = stats[modelId];
      
      if (!modelData) return;
      
      // Calculate normalized scores (lower is better)
      const timeScore = modelData.timeTaken / Math.max(1, fastest.time);
      const tokenScore = modelData.tokensUsed / Math.max(1, leastTokens.tokens);
      const efficiencyScore = modelData.averageTokenTime / Math.max(0.1, mostEfficient.tokenTime);
      
      // Combined score (lower is better)
      modelScores[modelId] = (timeScore + tokenScore + efficiencyScore) / 3;
    });
    
    // Find model with best (lowest) score
    let bestModelId = Object.keys(modelScores)[0];
    let bestScore = modelScores[bestModelId];
    
    Object.entries(modelScores).forEach(([modelId, score]) => {
      if (score < bestScore) {
        bestScore = score;
        bestModelId = modelId;
      }
    });
    
    return {
      fastest,
      mostEfficient,
      leastTokens,
      bestOverall: bestModelId,
      scores: modelScores
    };
  };

  // Reset chat history for the active model
  const clearChat = () => {
    setChatHistory(prev => ({
      ...prev,
      [activeModel]: []
    }));
  };

  // Sort models by response time
  const orderedModels = [...models].sort((a, b) => {
    const indexA = responseOrder.indexOf(a.id);
    const indexB = responseOrder.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="App">
      <h1 className="title">LLM Intelligence Console 🦇</h1>
      
      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button 
          className={activeMode === 'compare' ? 'active' : ''} 
          onClick={() => setActiveMode('compare')}
        >
          Compare Mode
        </button>
        <button 
          className={activeMode === 'chat' ? 'active' : ''} 
          onClick={() => setActiveMode('chat')}
        >
          Chat Mode
        </button>
      </div>

      {/* Chat Mode Model Selector */}
      {activeMode === 'chat' && (
        <div className="model-selector">
          <label>Select Model: </label>
          <select 
            value={activeModel} 
            onChange={(e) => setActiveModel(e.target.value)}
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          <button onClick={clearChat} className="clear-chat-btn">Clear Chat</button>
        </div>
      )}

      {/* Chat History Display */}
      {activeMode === 'chat' && (
        <div className="chat-container">
          <div className="chat-messages">
            {chatHistory[activeModel]?.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${message.role}`}
                style={{
                  backgroundColor: message.role === 'user' ? '#e6f7ff' : 
                                  message.role === 'system' ? '#ffebeb' : '#f0f2f5'
                }}
              >
                <strong>{message.role === 'user' ? 'You' : 
                         message.role === 'system' ? 'System' : 
                         models.find(m => m.id === activeModel)?.name}:</strong> {message.content}
              </div>
            ))}
            {loading[activeModel] && (
              <div className="chat-message assistant loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Input Section */}
      <div className="prompt-section">
        <textarea
          className="prompt-input"
          placeholder={activeMode === 'compare' ? "Type your prompt to compare models..." : "Type your message..."}
          value={sharedPrompt}
          onChange={(e) => setSharedPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              activeMode === 'compare' ? handleRunAll() : handleChatSend();
            }
          }}
        />
        <button 
          className="run-button" 
          onClick={activeMode === 'compare' ? handleRunAll : handleChatSend}
        >
          {activeMode === 'compare' ? 'Compare All Models' : 'Send'}
        </button>
      </div>
      
      {/* Prompt History */}
      {promptHistory.length > 0 && (
        <div className="history-box">
          <h3>🧠 Prompt History</h3>
          <ul className="history-list">
            {promptHistory.map((p, index) => (
              <li key={index} onClick={() => setSharedPrompt(p)}>
                {p.length > 80 ? p.slice(0, 80) + '...' : p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparison Results */}
      {activeMode === 'compare' && comparisonResults && (
        <div className="comparison-results">
          <h3>Performance Analysis</h3>
          <div className="result-metrics">
            <div className="metric">
              <span className="label">Fastest Response:</span> 
              <span className="value">
                {models.find(m => m.id === comparisonResults.fastest.id)?.name} 
                ({comparisonResults.fastest.time}ms)
              </span>
            </div>
            <div className="metric">
              <span className="label">Most Token Efficient:</span> 
              <span className="value">
                {models.find(m => m.id === comparisonResults.leastTokens.id)?.name} 
                ({comparisonResults.leastTokens.tokens} tokens)
              </span>
            </div>
            <div className="metric">
              <span className="label">Best Overall:</span> 
              <span className="value">
                {models.find(m => m.id === comparisonResults.bestOverall)?.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Model Responses */}
      {activeMode === 'compare' && (
        <div className="model-section">
          {orderedModels.map((model) => (
            <div key={model.id} className="model-box" style={{ borderTop: `5px solid ${model.color}` }}>
              <div className="model-header">
                <h2>{model.name}</h2>
                {comparisonResults?.bestOverall === model.id && (
                  <span className="badge best-model">⭐ Best Overall</span>
                )}
                {comparisonResults?.fastest.id === model.id && (
                  <span className="badge fastest">⚡ Fastest</span>
                )}
                {comparisonResults?.leastTokens.id === model.id && (
                  <span className="badge efficient">🎯 Most Efficient</span>
                )}
              </div>
              
              <div className="response">
                {loading[model.id]
                  ? <div className="loading-spinner">Processing...</div>
                  : responses[model.id] || 'No response yet'}
              </div>

              {modelStats[model.id] && (
                <div className="response-meta">
                  <div>⏱️ Response Time: {modelStats[model.id].timeTaken || 0} ms</div>
                  <div>🔢 Tokens Used: {modelStats[model.id].tokensUsed || 0}</div>
                  <div>📏 Response Length: {modelStats[model.id].responseLength || 0} chars</div>
                  <div>⚙️ Tokens/ms: {(modelStats[model.id].averageTokenTime || 0).toFixed(3)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;