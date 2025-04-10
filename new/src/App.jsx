import React, { useState } from 'react';
import './App.css';

const models = [
  { id: 'gemma', name: 'Gemma' },
  { id: 'llama2', name: 'LLaMA 2' },
  { id: 'mistral', name: 'Mistral' }
];

const fetchModelResponse = async (model, prompt) => {
  const response = await fetch(`http://localhost:8080/api/prompt/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.text();
};

function App() {
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [responseOrder, setResponseOrder] = useState([]);
  const [modelTimes, setModelTimes] = useState({});
  const [promptHistory, setPromptHistory] = useState([]);

  const handleRunAll = () => {
    if (!sharedPrompt.trim()) return;

    // Update prompt history (no duplicates, limit to last 10)
    const newHistory = [sharedPrompt, ...promptHistory.filter(p => p !== sharedPrompt)];
    setPromptHistory(newHistory.slice(0, 10));

    models.forEach(model => {
      setLoading(prev => ({ ...prev, [model.id]: true }));
      setResponses(prev => ({ ...prev, [model.id]: 'Scanning the shadows…' }));

      const start = performance.now();

      fetchModelResponse(model.id, sharedPrompt)
        .then(response => {
          const end = performance.now();
          const timeTaken = Math.round(end - start);

          setResponses(prev => ({ ...prev, [model.id]: response }));
          setResponseOrder(prev => [...prev, model.id]);
          setModelTimes(prev => ({ ...prev, [model.id]: timeTaken }));

          setLoading(prev => ({ ...prev, [model.id]: false }));
        })
        .catch(error => {
          setResponses(prev => ({ ...prev, [model.id]: `Error: ${error.message}` }));
          setLoading(prev => ({ ...prev, [model.id]: false }));
        });
    });
  };

  const handleRetry = async (modelId) => {
    setLoading(prev => ({ ...prev, [modelId]: true }));
    setResponses(prev => ({ ...prev, [modelId]: 'Retrying scan...' }));

    try {
      const start = performance.now();
      const data = await fetchModelResponse(modelId, sharedPrompt);
      const end = performance.now();

      setResponses(prev => ({ ...prev, [modelId]: data }));
      setResponseOrder(prev => [...prev, modelId]);
      setModelTimes(prev => ({ ...prev, [modelId]: Math.round(end - start) }));
    } catch (err) {
      setResponses(prev => ({ ...prev, [modelId]: `Error: ${err.message}` }));
    } finally {
      setLoading(prev => ({ ...prev, [modelId]: false }));
    }
  };

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

      <div className="prompt-section">
        <textarea
          className="prompt-input"
          placeholder="Type your prompt..."
          value={sharedPrompt}
          onChange={(e) => setSharedPrompt(e.target.value)}
        />
        <button className="run-all-button" onClick={handleRunAll}>Run All</button>
      </div>

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

      <div className="model-section">
        {orderedModels.map((model) => (
          <div key={model.id} className="model-box">
            <h2>{model.name}</h2>
            <div className="response">
              {loading[model.id]
                ? 'Oracle is retrieving data…'
                : responses[model.id]}
            </div>

            {modelTimes[model.id] && (
              <div className="response-time">
                ⏱️ {modelTimes[model.id]} ms
              </div>
            )}

            {responses[model.id]?.startsWith('Error') && (
              <button className="retry-btn" onClick={() => handleRetry(model.id)} disabled={loading[model.id]}>
                Retry {model.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
