import { useState, useCallback } from 'react';
import './App.css';

function App() {
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [responses, setResponses] = useState({
    ollama: '',
    anthropic: '',
    openai: ''
  });
  const [loading, setLoading] = useState({
    ollama: false,
    anthropic: false,
    openai: false
  });
  const [responseOrder, setResponseOrder] = useState([]);

  const models = [
    { id: 'openai', name: 'OpenAI (GPT-4o)', color: '#2ECC71' },
    { id: 'anthropic', name: 'Anthropic (Claude)', color: '#9B59B6' },
    { id: 'ollama', name: 'Ollama (Gemma 2)', color: '#E67E22' }
  ];

  const handlePromptChange = useCallback((value) => {
    setSharedPrompt(value);
  }, []);

  const fetchModelResponse = useCallback(async (model, prompt) => {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const response = await fetch(`http://localhost:8080/api/${model}/${encodedPrompt}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.text();
      return data;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sharedPrompt.trim()) return;

    setResponseOrder([]);
    setLoading({
      ollama: true,
      anthropic: true,
      openai: true
    });

    setResponses({
      ollama: 'Scanning the shadows...',
      anthropic: 'Scanning the shadows...',
      openai: 'Scanning the shadows...'
    });

    models.forEach(model => {
      fetchModelResponse(model.id, sharedPrompt)
        .then(response => {
          setResponses(prev => ({
            ...prev,
            [model.id]: response
          }));

          setResponseOrder(prev => [...prev, model.id]);

          setLoading(prev => ({
            ...prev,
            [model.id]: false
          }));
        })
        .catch(error => {
          setResponses(prev => ({
            ...prev,
            [model.id]: `Error: ${error.message}`
          }));

          setLoading(prev => ({
            ...prev,
            [model.id]: false
          }));
        });
    });
  }, [sharedPrompt, fetchModelResponse, models]);

  const isLoading = Object.values(loading).some(status => status);

  return (
    <div className="app-container">
      <h1>Dark Lab: LLM Intelligence Console</h1>

      <div className="shared-prompt-container">
        <div className="shared-prompt-area">
          <textarea
            placeholder="Enter your prompt – as if summoning the Bat from the shadows..."
            value={sharedPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            disabled={isLoading}
          />
          <button 
            onClick={handleSubmit}
            disabled={isLoading || !sharedPrompt.trim()}
            className="submit-all-btn"
          >
            {isLoading ? 'Deploying Signals...' : 'Run Model Intel Scan'}
          </button>
        </div>
      </div>

      {responseOrder.length > 0 && (
        <div className="response-order">
          <h3>Intel Arrival Sequence:</h3>
          <ol>
            {responseOrder.map((modelId, index) => {
              const model = models.find(m => m.id === modelId);
              return (
                <li key={modelId} style={{ color: model.color }}>
                  {model.name} {index === 0 ? '(fastest to respond – like the Bat swooping in)' : ''}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="model-grid">
        {models.map(model => (
          <div 
            key={model.id} 
            className="model-box"
            style={{ 
              borderColor: model.color,
              boxShadow: responseOrder[0] === model.id ? `0 0 15px ${model.color}` : 'none'
            }}
          >
            <h2 style={{ color: model.color }}>
              {model.name}
              {responseOrder.includes(model.id) && (
                <span className="response-badge">
                  {responseOrder.indexOf(model.id) + 1}
                </span>
              )}
            </h2>

            <div className="response-area">
              <h3>Response from the Cave:</h3>
              <div className="response-content">
                {responses[model.id] ? (
                  <div className="response-text">{responses[model.id]}</div>
                ) : (
                  <div className="placeholder-text">
                    Awaiting signal... Oracle is retrieving the data.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
