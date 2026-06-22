import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Paperclip, 
  Brain,
  HelpCircle,
  Clock,
  Monitor,
  Mic
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Response mapping based on actual dashboard data
const getAgentResponse = (userText: string): string => {
  const text = userText.toLowerCase();
  
  if (text.includes('filial') || text.includes('filiais') || text.includes('sudeste') || text.includes('nordeste') || text.includes('vendeu')) {
    return `Analisando os dados consolidados das filiais, a **Filial Sudeste** é a líder absoluta de faturamento, acumulando **R$ 9.246.720** anualizados. Isso representa **42% da receita total** da empresa.

Aqui está a distribuição de participação por filial:
* **Filial Sudeste**: R$ 9.246.720 (42.0% de participação)
* **Filial Sul**: R$ 7.485.440 (34.0% de participação)
* **Filial Nordeste**: R$ 5.283.840 (24.0% de participação)

*A Filial Nordeste, embora menor, foi a que apresentou a maior taxa de crescimento proporcional no último trimestre (+12.4% MoM).*`;
  }
  
  if (text.includes('dre') || text.includes('lucro') || text.includes('líquido') || text.includes('liquido') || text.includes('consolidado') || text.includes('margem liquida') || text.includes('margem líquida')) {
    return `De acordo com o demonstrativo da **DRE Gerencial**, o **Lucro Líquido consolidado do ano** fechou em **R$ 3.058.460**, o que resulta em uma **margem líquida média de 13.9%** sobre a Receita Líquida total (R$ 22.016.000).

Principais destaques do resultado:
* **Receita Líquida**: R$ 22.016.000 (100.0%)
* **Lucro Bruto**: R$ 12.373.000 (56.2% de margem)
* **EBITDA**: R$ 4.028.928 (18.3% de margem)
* **Lucro Líquido**: R$ 3.058.460 (13.9% de margem)

*O principal gargalo operacional identificado foram os custos com CMV/CSP que consumiram 43.8% da receita líquida.*`;
  }
  
  if (text.includes('rfv') || text.includes('clientes') || text.includes('at risk') || text.includes('risco') || text.includes('segmentação') || text.includes('segmentos')) {
    return `A nossa segmentação **RFV (Recência, Frequência e Valor)** dividiu a carteira de clientes ativos nos seguintes grupos:

* **Champions** (35% do faturamento): Clientes de alta recência, alta frequência e alto ticket. Recomendação: campanhas de relacionamento e fidelidade exclusivas.
* **Loyal** (40% do faturamento): Clientes frequentes de ticket médio. Recomendação: cross-selling e up-selling de serviços secundários.
* **At Risk** (25% do faturamento): Clientes que compravam muito, mas estão sem nenhuma transação nos últimos 90 dias.

**Plano de Ação sugerido para o grupo 'At Risk'**:
*Recomendo realizar um disparo imediato de e-mail marketing oferecendo reativação baseada nos produtos adquiridos anteriormente, acoplada a um cupom de incentivo, ou contato direto do time de CS. A probabilidade de recuperar um cliente deste segmento é 3x superior à conversão de um lead novo.*`;
  }
  
  if (text.includes('ebitda') || text.includes('margem ebitda') || text.includes('caixa')) {
    return `O **EBITDA acumulado do exercício** fechou em **R$ 4.028.928**, correspondendo a uma **margem EBITDA consolidada de 18.3%** sobre a Receita Líquida total de R$ 22.016.000.

O EBITDA operacional teve seu melhor desempenho nos meses de:
* **Junho**: R$ 438.450 (18.6% de margem)
* **Dezembro**: R$ 603.900 (19.8% de margem)

*Esse patamar demonstra excelente capacidade de geração de caixa das operações essenciais, descontando efeitos puramente tributários, depreciações e encargos de dívidas.*`;
  }
  
  if (text.includes('oi') || text.includes('olá') || text.includes('ola') || text.includes('bom dia') || text.includes('boa tarde') || text.includes('ajuda') || text.includes('quem é você')) {
    return `Olá! Eu sou o **Agente Cognitivo da BHS**, seu assistente virtual especializado em Business Intelligence.

Posso responder perguntas detalhadas sobre os dados consolidados do seu negócio. 

Tente clicar em uma das sugestões rápidas na tela ou pergunte algo como:
- *"Qual filial vendeu mais?"*
- *"Como ficou o Lucro Líquido consolidado na DRE?"*
- *"O que fazer com os clientes At Risk?"*
- *"Qual a margem EBITDA média do ano?"*`;
  }

  // Fallback response showing options
  return `Entendi sua dúvida. Como estou em modo de homologação, posso detalhar informações consolidadas da base real do seu dashboard. 

Por favor, escolha um dos temas que já tenho mapeados:
1. **Faturamento de Filiais** (Sul, Sudeste e Nordeste).
2. **Lucro Líquido** e margens na DRE Gerencial.
3. Plano de ação para clientes **At Risk** (segmentação RFV).
4. Margens e valores mensais de **EBITDA**.

Pergunte algo como: *'Qual filial vendeu mais?'* ou *'Como ficou a margem líquida?'*`;
};

// Word-by-word streaming effect component
const StreamText: React.FC<{ text: string; onComplete: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    const words = text.split(' ');
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 20); // smooth word typing speed
    
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <>{renderMessageText(displayedText)}</>;
};

// Bold and list parser helper (translates markdown to visual elements matching mockup)
const renderMessageText = (text: string) => {
  return text.split('\n').map((line, lineIndex) => {
    // Custom blue bullet points
    if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
      const content = line.trim().substring(1).trim();
      return (
        <div key={lineIndex} className="ml-4 flex items-start gap-2 mb-1.5 text-slate-700 text-xs sm:text-sm">
          <span className="text-blue-600 font-bold shrink-0">•</span>
          <span>{renderBoldText(content)}</span>
        </div>
      );
    }
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const content = numberedMatch[2];
      return (
        <div key={lineIndex} className="ml-4 mb-1.5 text-slate-700 text-xs sm:text-sm flex gap-1.5">
          <span className="font-bold text-blue-600">{num}.</span>
          <span>{renderBoldText(content)}</span>
        </div>
      );
    }
    return (
      <p key={lineIndex} className="mb-2 text-slate-700 text-xs sm:text-sm leading-relaxed last:mb-0">
        {renderBoldText(line)}
      </p>
    );
  });
};

const renderBoldText = (text: string) => {
  // Check for italic note wrapped in asterisks
  if (text.startsWith('*') && text.endsWith('*')) {
    return <span className="italic text-slate-500 font-medium">{text.slice(1, -1)}</span>;
  }
  
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const AgenteView: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-2',
      title: 'Análise de Desempenho Regional',
      date: 'Hoje',
      messages: [
        { id: '1a', sender: 'agent', text: 'Olá! Carreguei o faturamento das filiais para a nossa homologação. Como posso ajudar?', timestamp: '11:42' }
      ]
    },
    {
      id: 'session-1',
      title: 'Auditoria de DRE e Margens',
      date: 'Ontem',
      messages: [
        { id: '2a', sender: 'user', text: 'Qual a margem EBITDA média?', timestamp: '15:20' },
        { id: '2b', sender: 'agent', text: 'O EBITDA consolidado foi de R$ 4.028.928, resultando em uma margem EBITDA de 18.3%.', timestamp: '15:20' }
      ]
    },
    {
      id: 'session-3',
      title: 'Segmentação RFV - At Risk',
      date: '18 de Junho',
      messages: [
        { id: '3a', sender: 'user', text: 'Como reativar os clientes At Risk?', timestamp: '11:05' },
        { id: '3b', sender: 'agent', text: 'A análise RFV dividiu nossa carteira de clientes, indicando 25% no grupo At Risk. Recomendo campanhas personalizadas de cupons de reativação.', timestamp: '11:05' }
      ]
    }
  ]);
  
  const [activeSessionId, setActiveSessionId] = useState<string>('session-2');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync active messages with selected session
  useEffect(() => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (session) {
      setMessages(session.messages);
    }
  }, [activeSessionId, sessions]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const time = formatTime();
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: time
    };

    // Update active session messages
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [...s.messages, userMsg] };
      }
      return s;
    }));

    setInputValue('');
    setIsTyping(true);

    // Simulate Agent Thinking Delay
    setTimeout(() => {
      setIsTyping(false);
      const fullResponseText = getAgentResponse(text);
      
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: fullResponseText,
        timestamp: formatTime(),
        isStreaming: true
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, agentMsg] };
        }
        return s;
      }));
    }, 1000);
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const createNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'Nova Conversa',
      date: 'Hoje',
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'agent',
          text: 'Olá! Sou o **Agente de Decisão BHS**. Pergunte sobre filiais, DRE ou EBITDA.',
          timestamp: formatTime()
        }
      ]
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (sessionId === activeSessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          // Reset to default session if none left
          const defId = 'session-default';
          return [{
            id: defId,
            title: 'Nova Conversa',
            date: 'Hoje',
            messages: [{ id: 'init', sender: 'agent', text: 'Pergunte sobre filiais, DRE ou EBITDA.', timestamp: formatTime() }]
          }];
        }
      }
      return filtered;
    });
  };

  const handleStreamingComplete = (msgId: string) => {
    // Persist finalized message (remove isStreaming flag)
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)
        };
      }
      return s;
    }));
  };

  const quickPrompts = [
    {
      title: 'Vendas por Filial',
      prompt: 'Qual filial vendeu mais?',
      desc: 'Mostra o faturamento e participação percentual por região.',
      icon: Brain
    },
    {
      title: 'Lucro Consolidado',
      prompt: 'Qual foi o Lucro Líquido consolidado na DRE?',
      desc: 'Consulta o resultado acumulado do ano e a margem líquida total.',
      icon: Sparkles
    },
    {
      title: 'Ações para Clientes At Risk',
      prompt: 'Como reativar os clientes At Risk?',
      desc: 'Apresenta recomendações da segmentação RFV para clientes inativos.',
      icon: HelpCircle
    },
    {
      title: 'Capacidade de Caixa',
      prompt: 'Qual a margem EBITDA média?',
      desc: 'Analisa o EBITDA consolidado e os melhores meses operacionais.',
      icon: Clock
    }
  ];

  return (
    <div className="flex flex-1 w-full bg-slate-50 overflow-hidden h-full">
      {/* LEFT COLUMN: Past Chats Sidebar (ChatGPT style) */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex h-full">
        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-blue-600 hover:bg-blue-50/40 text-blue-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            Nova Conversa
          </button>
        </div>

        {/* Chats History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Histórico de Análises</p>
          
          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                className={`group/item w-full flex items-center justify-between transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-[#edf2f9] text-slate-900 border-l-4 border-blue-600 rounded-r-lg' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <button
                  onClick={() => setActiveSessionId(s.id)}
                  className="flex-1 text-left p-3 flex items-start gap-2.5 min-w-0 bg-transparent border-none cursor-pointer"
                >
                  <MessageCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight text-slate-800">{s.title}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{s.date}</p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  className="p-1.5 mr-1.5 rounded hover:bg-slate-200/50 text-slate-400 hover:text-rose-600 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 cursor-pointer shrink-0"
                  title="Excluir conversa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info matching mockup */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
            <MessageCircle className="w-4 h-4 text-slate-400" />
            <span>AMBIENTE CONVERSACIONAL</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Conversational Pane */}
      <div className="flex-1 flex flex-col bg-[#f4f7fa] relative min-w-0 h-full overflow-hidden">
        {/* Chat Pane Header */}
        <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Monitor Avatar */}
            <div className="h-9 w-9 bg-[#0f172a] rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
              <Monitor className="w-5 h-5 text-slate-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 leading-none">Agente de Decisão BHS</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Assistente IA Online · Homologação
              </p>
            </div>
          </div>
        </div>

        {/* Messages and Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => {
              const isAgent = msg.sender === 'agent';

              return (
                <div key={msg.id} className={`flex items-start gap-4 ${isAgent ? '' : 'flex-row-reverse'} animate-fade-in`}>
                  {/* Avatar */}
                  {isAgent ? (
                    <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Monitor className="w-4.5 h-4.5 text-slate-200" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      U
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className="flex flex-col max-w-[80%] md:max-w-[75%]">
                    {/* Bubble */}
                    <div className={`p-4 rounded-2xl shadow-xs border ${
                      isAgent 
                        ? 'bg-white border-slate-200/80 rounded-tl-none text-slate-850' 
                        : 'bg-[#0f172a] border-slate-950 text-white rounded-tr-none'
                    }`}>
                      {isAgent ? (
                        msg.isStreaming ? (
                          <StreamText 
                            text={msg.text} 
                            onComplete={() => handleStreamingComplete(msg.id)} 
                          />
                        ) : (
                          renderMessageText(msg.text)
                        )
                      ) : (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-semibold">{msg.text}</p>
                      )}
                    </div>
                    {/* Timestamp */}
                    <span className={`text-[9px] text-slate-400 font-semibold mt-1.5 px-1 ${isAgent ? 'text-left' : 'text-right'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-4 animate-fade-in">
                <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Monitor className="w-4.5 h-4.5 text-slate-200" />
                </div>
                <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl rounded-tl-none shadow-xs flex items-center space-x-1.5 h-10">
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions panels (only show when there are no user messages in the session yet) */}
          {!messages.some(m => m.sender === 'user') && !isTyping && (
            <div className="max-w-3xl mx-auto mt-8 px-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-4">Atalhos rápidos para análise de dados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="text-left bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-slate-50/50 p-4 rounded-xl transition-all duration-200 cursor-pointer group flex items-start gap-3.5"
                    >
                      <span className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100/60 transition-colors">
                        <Icon className="w-4.5 h-4.5 text-blue-600" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1.5 group-hover:text-slate-500 transition-colors">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar Section matching mockup */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-full py-1.5 pl-4 pr-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Paperclip className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-slate-600 shrink-0" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder="Pergunte ao Agente sobre filiais, DRE..."
                disabled={isTyping}
                className="flex-1 bg-transparent border-none focus:outline-none px-3 text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50"
              />
              <div className="flex items-center space-x-2.5 shrink-0">
                <Mic className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-slate-600" />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                  title="Enviar mensagem"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold text-center mt-2.5">
              O Agente virtual da BHS lê e sintetiza métricas. Informações geradas podem conter imprecisões com base nas massas de simulação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
