import React, { useState } from 'react';
import { getAIRecommendation } from '../api';
import { Send, Bot, User } from 'lucide-react';

export default function AIChat() {
    const [messages, setMessages] = useState([
        { role: 'bot', text: '¡Hola! Soy tu asistente de SaltaSalud. ¿En qué puedo ayudarte hoy? (Ej: "Necesito un pediatra en Orán")' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await getAIRecommendation(userMsg.text);
            const botMsg = { role: 'bot', text: response.response || "Lo siento, no pude procesar tu solicitud." };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: 'Error de conexión con el asistente.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center shadow-md">
                <Bot className="mr-3" />
                <div>
                    <h2 className="font-bold">Asistente Virtual IA</h2>
                    <p className="text-xs opacity-90">Powered by LangChain</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu consulta aquí..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
