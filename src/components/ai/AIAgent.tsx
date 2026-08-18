import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { useApp } from '../../store/AppContext';

interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
  type?: 'insight' | 'warning' | 'tip' | 'normal';
}

const QUICK_PROMPTS = [
  'Show today\'s expense summary',
  'Which category has highest spend?',
  'Any duplicate entries today?',
  'Pending approvals analysis',
  'Cash variance alerts',
  'Driver expense this week',
];

const AI_RESPONSES: Record<string, string> = {
  default: 'I can help you analyze your expense data, identify anomalies, suggest cost savings, and provide insights on cash flow. What would you like to know?',
  summary: `**Today's Expense Summary:**\n• Total Expenses: Rs. 36,150\n• Posted: Rs. 24,550 (68%)\n• Pending Approval: Rs. 11,600 (32%)\n• Cost Centers: 5 active\n• Transactions: 8 entries\n\n**Balance Status:** Rs. 63,950 available across all cost centers.`,
  category: `**Category Analysis (Today):**\n1. 🚗 Vehicle & Transport - Rs. 14,700 (41%)\n2. 🍽️ Food & Beverages - Rs. 8,200 (23%)\n3. 🔧 Maintenance - Rs. 7,500 (21%)\n4. 📋 Office Supplies - Rs. 3,450 (10%)\n5. 📦 Miscellaneous - Rs. 2,300 (6%)\n\n**Insight:** Vehicle expenses are 25% higher than last week. Consider reviewing diesel consumption.`,
  duplicate: `**Duplicate Entry Check:**\n✅ No exact duplicates found today.\n\n⚠️ Similar entries detected:\n• Staff Lunch (Production) - 2 entries within 2 hours - Rs. 1,500 each\n  → May be intentional for different meal times\n\n**Recommendation:** Review Staff Lunch entries at 12:30 PM and 2:00 PM.`,
  pending: `**Pending Approvals Analysis:**\n\n🔴 Urgent (SLA < 2h):\n• Diesel - Rs. 2,000 (Dispatch) - Submitted 3h ago\n\n🟡 Due Today:\n• Equipment Repair - Rs. 3,500 (North Branch)\n• Petty Misc - Rs. 250 (Warehouse)\n\n**Total Pending:** Rs. 5,750 (3 entries)\n**Recommendation:** Approve diesel expense to unblock driver.`,
  variance: `**Cash Variance Alerts:**\n\n✅ South Branch - On track\n✅ Production Unit - On track\n⚠️ Dispatch - 15% over weekly average (vehicle expenses)\n✅ Warehouse - On track\n✅ North Branch - Pending maintenance approval affects balance\n\n**Monthly Trend:** Overall expenses up 8% vs last month.`,
  driver: `**Driver Expense Summary (This Week):**\n\n• Murugan Pillai: Rs. 8,400 (Diesel: 5,200 + Toll: 1,800 + Bata: 1,400)\n• Selvam Rajan: Rs. 6,200 (Diesel: 4,100 + Toll: 1,200 + Parking: 900)\n• Chandran Kumar: Rs. 7,100 (Diesel: 5,800 + Toll: 800 + Bata: 500)\n\n**Total: Rs. 21,700**\n**Insight:** Diesel consumption is highest for Chennai-Ramanathapuram route.`,
};

function getResponse(text: string): { text: string; type: Message['type'] } {
  const lower = text.toLowerCase();
  if (lower.includes('summary') || lower.includes('today')) return { text: AI_RESPONSES.summary, type: 'insight' };
  if (lower.includes('category') || lower.includes('highest')) return { text: AI_RESPONSES.category, type: 'insight' };
  if (lower.includes('duplicate')) return { text: AI_RESPONSES.duplicate, type: 'warning' };
  if (lower.includes('pending') || lower.includes('approval')) return { text: AI_RESPONSES.pending, type: 'warning' };
  if (lower.includes('variance') || lower.includes('alert')) return { text: AI_RESPONSES.variance, type: 'warning' };
  if (lower.includes('driver')) return { text: AI_RESPONSES.driver, type: 'insight' };
  return { text: AI_RESPONSES.default, type: 'normal' };
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
          style={{ background: 'var(--brand-600)' }}
        >
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`ai-bubble px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'ai-bubble-user rounded-br-sm'
              : msg.type === 'warning'
              ? 'ai-bubble-warning rounded-bl-sm'
              : msg.type === 'insight'
              ? 'ai-bubble-insight rounded-bl-sm'
              : 'ai-bubble-normal rounded-bl-sm'
          }`}
        >
          {msg.text.split('\n').map((line, i) => (
            <p key={i} className={`ai-bubble-line ${line.startsWith('**') ? 'ai-bubble-bold' : ''}`}>
              {line.replace(/\*\*/g, '')}
            </p>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1 px-1">
          {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export function AIAgent() {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      text: 'Hello! I\'m your YEN Expense AI Agent. I can analyze expenses, detect anomalies, provide cash flow insights, and help with approvals. How can I help you today?',
      timestamp: new Date(),
      type: 'normal',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { text: responseText, type } = getResponse(text);
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: responseText,
        timestamp: new Date(),
        type,
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1000 + Math.random() * 800);
  };

  if (!state.aiAgentOpen) return null;

  return (
    <div className="ai-agent-window fixed right-4 bottom-4 w-96 card rounded-2xl shadow-2xl z-50 flex flex-col" style={{ height: '580px' }}>
      
      {/* Header */}
      <div className="ai-header flex items-center gap-3 px-4 py-3.5 rounded-t-2xl">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center ai-pulse" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Bot size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Expense AI Agent</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-white/80 text-xs">Online • Analyzing your expenses</p>
          </div>
        </div>
        <button onClick={() => dispatch({ type: 'TOGGLE_AI_AGENT' })} className="text-white/70 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Insights Bar */}
      <div className="ai-insights-bar flex items-center gap-2 px-3 py-2 border-b">
        <Sparkles size={14} style={{ color: 'var(--brand-600)' }} />
        <p className="text-xs font-medium" style={{ color: 'var(--brand-700)' }}>3 pending approvals need your attention</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isTyping && (
          <div className="flex justify-start mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2" style={{ background: 'var(--brand-600)' }}>
              <Bot size={14} className="text-white" />
            </div>
            <div className="ai-bubble-normal rounded-2xl rounded-bl-sm px-4 py-3 border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {QUICK_PROMPTS.slice(0, 3).map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="ai-quick-btn flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full transition-colors font-medium border"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="px-3 pb-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about expenses..."
          className="input flex-1 !rounded-xl !py-2"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="btn-primary !rounded-xl !px-0 w-9 h-9 flex items-center justify-center flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}