import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { LiveClient } from '../services/liveClient';
import { DocumentList } from './DocumentList';

interface ChatInterfaceProps {
  userName: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveClientRef = useRef<LiveClient | null>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: `¡Hola ${userName}! Soy el asistente virtual del Liceo Psicopedagógico la Casita de Maju. He analizado el sitio y encontré varios documentos importantes sobre estimulación temprana y cronogramas. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date()
      }
    ]);
  }, [userName]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model' as const,
        parts: [{ text: msg.text }]
      }));

      const responseText = await sendMessageToGemini(history, userMessage.text);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Lo siento, no pude generar una respuesta.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        text: "Hubo un error al conectar con el asistente. Por favor intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLiveMode = async () => {
    if (isLiveActive) {
      // Stop live mode
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      setIsLiveActive(false);
    } else {
      // Start live mode
      try {
        setIsLiveActive(true);
        liveClientRef.current = new LiveClient();
        await liveClientRef.current.connect({
          onOpen: () => console.log("Live session connected"),
          onMessage: (text, audio) => {
            // Visual feedback could be added here (e.g. audio wave)
          },
          onClose: () => setIsLiveActive(false),
          onError: (err) => {
            console.error(err);
            setIsLiveActive(false);
            alert("Error conectando con el servicio de voz. Verifica tu micrófono.");
          }
        });
      } catch (err) {
        console.error(err);
        setIsLiveActive(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <span className="text-xl">🏫</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">
              Casita de Maju
            </h1>
            <p className="text-xs text-green-600 font-medium flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              En línea | Usuario: {userName}
            </p>
          </div>
        </div>
        <button 
          onClick={toggleLiveMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
            isLiveActive 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isLiveActive ? (
            <>
              <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
              Escuchando...
            </>
          ) : (
            <>
              <span>🎙️</span>
              Modo Voz
            </>
          )}
        </button>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <DocumentList />
          
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : msg.role === 'system'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-100 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLiveActive ? "Modo de voz activo - Habla para interactuar..." : "Escribe tu consulta sobre los documentos..."}
              disabled={isLoading || isLiveActive}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || isLiveActive || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 rounded-xl font-medium transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
          {isLiveActive && (
            <p className="text-xs text-center text-gray-500 mt-2">
              El micrófono está activo. El asistente te responderá con voz.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};