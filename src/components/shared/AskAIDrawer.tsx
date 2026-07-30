import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { generateDenseLayout, generateFocusedLayout } from '../../services/layoutTemplates';
import { generateModuleWithOpenAI } from '../../services/openaiService';
import type { AppModule } from '../../types';
import { 
  X, 
  Plus, 
  Maximize2, 
  ChevronDown, 
  Sliders, 
  ArrowUp, 
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  Trash2,
  Settings
} from 'lucide-react';

interface LocalMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  moduleConfig?: AppModule;
}

const newMessageId = (sender: LocalMessage['sender']) => `${sender}-${crypto.randomUUID()}`;

export const AskAIDrawer: React.FC = () => {
  const { 
    isAskDrawerOpen, 
    setIsAskDrawerOpen, 
    addUserModule, 
    removeUserModule, 
    userModules, 
    setCurrentTab,
    showToast,
    calculatedFields,
    addCalculatedField,
    removeCalculatedField
  } = useDashboard();

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // States for new calculated field form
  const [newCalcLabel, setNewCalcLabel] = useState('');
  const [newCalcWorkspace, setNewCalcWorkspace] = useState('ws-1');
  const [newCalcField, setNewCalcField] = useState('valor_liquido');
  const [newCalcExpr, setNewCalcExpr] = useState('* 1.10');

  const WORKSPACE_FIELDS: Record<string, string[]> = {
    'ws-1': ['valor_liquido', 'custo_operacional'],
    'ws-2': ['valor_pago', 'frete'],
    'ws-3': ['total_gasto', 'recencia_dias', 'frequencia_compras'],
    'ws-4': ['receita_bruta', 'custos', 'ebitda']
  };

  const handleCreateCalculatedField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalcLabel.trim()) return;

    const id = `calc-${newCalcLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    addCalculatedField({
      id,
      workspaceId: newCalcWorkspace,
      label: newCalcLabel,
      formulaType: 'expression',
      sourceField: newCalcField,
      expression: newCalcExpr
    });

    setNewCalcLabel('');
    setNewCalcExpr('* 1.10');
  };
  
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.removeItem('bhs_openai_key');
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isTyping]);

  if (!isAskDrawerOpen) return null;

  const runHeuristicFallback = (text: string, timeStr: string) => {
    const cleanInput = text.toLowerCase().trim();
    let responseText: string;
    let generatedModule: AppModule | undefined;

    // Scan for removal commands
    if (cleanInput.includes('remover') || cleanInput.includes('excluir') || cleanInput.includes('deletar') || cleanInput.includes('desfazer')) {
      const dynamicMods = userModules.filter(m => m.id !== 'mod-base-dados');
      if (dynamicMods.length > 0) {
        const lastMod = dynamicMods[dynamicMods.length - 1];
        removeUserModule(lastMod.id);
        responseText = `Entendido. Removi o módulo dinâmico **${lastMod.label}** da barra de menu.`;
        
        showToast(`Módulo "${lastMod.label}" removido.`, 'Desfazer', () => {
          addUserModule(lastMod);
        });
      } else {
        responseText = 'Não há módulos dinâmicos instalados no momento para remover.';
      }
    } 
    // Scan for creation commands
    else if (cleanInput.includes('cria') || cleanInput.includes('crie') || cleanInput.includes('novo') || cleanInput.includes('tela') || cleanInput.includes('modulo') || cleanInput.includes('módulo')) {
      const isFocused = cleanInput.includes('focad') || cleanInput.includes('espaçad') || cleanInput.includes('simples') || cleanInput.includes('pouco');
      const isShopee = cleanInput.includes('shopee') || cleanInput.includes('pedido') || cleanInput.includes('frete');
      const isEnriched = cleanInput.includes('enriquecid') || cleanInput.includes('interativ') || cleanInput.includes('filtro') || cleanInput.includes('orden');
      
      const workspaceId = isShopee ? 'ws-2' : 'ws-1';
      
      // Dynamically extract name from input
      let titleName = isShopee ? 'Pedidos Shopee' : 'Faturamento Geral';
      const nameMatch = text.match(/(?:chamado|chamada|nome|chamada de)\s+["'«“]?([^"'\n,.]+)/i);
      if (nameMatch && nameMatch[1]) {
        titleName = nameMatch[1].trim();
      } else {
        const quoteMatch = text.match(/["'“]([^"'”]+)["'”]/);
        if (quoteMatch && quoteMatch[1]) {
          titleName = quoteMatch[1].trim();
        }
      }
      
      if (isFocused) {
        generatedModule = generateFocusedLayout(workspaceId, titleName, isEnriched);
        responseText = `Perfeito! Montei o dashboard no **Layout Focado (Espaçada)**${isEnriched ? ' com componentes enriquecidos' : ''}. Os gráficos são expandidos para cobrir toda a largura útil.`;
      } else {
        generatedModule = generateDenseLayout(workspaceId, titleName, isEnriched);
        responseText = `Certamente! Montei o dashboard no **Layout Completo (Densa)**${isEnriched ? ' contendo tabelas e gráficos enriquecidos' : ''}, distribuído em 3 linhas contendo KPIs, múltiplos gráficos comparativos e uma tabela interativa.`;
      }

      // Add to Store
      addUserModule(generatedModule);

      // Highlight Sidebar item
      setTimeout(() => {
        const newElem = document.getElementById(`sidebar-item-${generatedModule?.id}`);
        if (newElem) {
          newElem.classList.add('animate-pulse', 'border-blue-400', 'bg-blue-50/40');
          setTimeout(() => {
            newElem.classList.remove('animate-pulse', 'border-blue-400', 'bg-blue-50/40');
          }, 3000);
        }
      }, 100);

      // Dispara o Toast de confirmação
      showToast(`Módulo "${generatedModule.label}" criado com sucesso!`, 'Acessar', () => {
        setCurrentTab(generatedModule!.screens[0].id);
      });
    } else {
      responseText = `Sou o copiloto **Ask AI** da BHS. Como não possuo chave ativa ou o comando não envolveu estruturação de tela, posso ajudar com:
* *"Crie uma tela de faturamento chamada Painel Sul no layout completo"*
* *"Crie um gráfico de Shopee enriquecido"*
* *"Excluir última tela"*`;
    }

    const agentMsg: LocalMessage = {
      id: newMessageId('agent'),
      sender: 'agent',
      text: responseText,
      timestamp: timeStr,
      moduleConfig: generatedModule
    };

    setLocalMessages(prev => [...prev, agentMsg]);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) setInputText('');

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Add user message
    const userMsg: LocalMessage = {
      id: newMessageId('user'),
      sender: 'user',
      text,
      timestamp: timeStr
    };

    setLocalMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // IA e chave ficam no backend; a falha preserva o fallback local.
    generateModuleWithOpenAI(text, calculatedFields)
        .then(parsedModule => {
          setIsTyping(false);
          
          // Add to Store
          addUserModule(parsedModule);

          // Highlight Sidebar item
          setTimeout(() => {
            const newElem = document.getElementById(`sidebar-item-${parsedModule.id}`);
            if (newElem) {
              newElem.classList.add('animate-pulse', 'border-blue-400', 'bg-blue-50/40');
              setTimeout(() => {
                newElem.classList.remove('animate-pulse', 'border-blue-400', 'bg-blue-50/40');
              }, 3000);
            }
          }, 100);

          // Toast
          showToast(`Módulo "${parsedModule.label}" criado sob medida por IA!`, 'Acessar', () => {
            setCurrentTab(parsedModule.screens[0].id);
          });

          const agentMsg: LocalMessage = {
            id: newMessageId('agent'),
            sender: 'agent',
            text: `Perfeito! Montei o dashboard personalizado **${parsedModule.label}** sob demanda a partir dos dados solicitados usando o **ChatGPT (gpt-4o-mini)**.`,
            timestamp: timeStr,
            moduleConfig: parsedModule
          };

          setLocalMessages(prev => [...prev, agentMsg]);
        })
        .catch(err => {
          setIsTyping(false);
          const message = err instanceof Error ? err.message : 'Falha ao gerar o módulo.';
          if (message.includes('invalid presentation')) {
            showToast(`Sugestão da IA recusada: ${message}`);
            setLocalMessages(prev => [...prev, {
              id: newMessageId('agent'),
              sender: 'agent',
              text: 'A sugestão não foi aplicada porque a configuração de apresentação contém uma chave inválida. Ajuste o preset, a política de rótulos ou o formato e tente novamente.',
              timestamp: timeStr,
            }]);
            return;
          }
          console.error('OpenAI Generation failed, falling back to heuristics:', err);
          runHeuristicFallback(text, timeStr);
        });
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const suggestions = [
    {
      title: 'Criar Módulo Completo',
      desc: 'KPIs, gráficos emparelhados e tabela de origem (Layout Denso).',
      prompt: 'Crie uma tela de faturamento no layout completo',
      icon: LayoutGrid
    },
    {
      title: 'Criar Dashboard Focado',
      desc: 'Visualização limpa com gráficos expandidos (Layout Focado).',
      prompt: 'Crie um painel de Shopee no layout focado',
      icon: Sparkles
    },
    {
      title: 'Desfazer Última Tela',
      desc: 'Remover o último módulo dinâmico do menu lateral.',
      prompt: 'Desfazer última alteração de tela',
      icon: Trash2
    }
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsAskDrawerOpen(false)}
        className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Slide-out Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out font-sans select-none"
        style={{
          backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
          backgroundSize: '16px 16px'
        }}
      >
        {/* Header - Cloudflare style drop down */}
        <div className="h-14 bg-white border-b border-slate-100 px-4 flex items-center justify-between shrink-0 z-10">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors cursor-pointer bg-transparent border-none"
            >
              <span>Nova conversa</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-8 left-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                <button 
                  onClick={() => {
                    setLocalMessages([]);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent"
                >
                  Limpar Conversa
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-md hover:bg-slate-50 transition-all cursor-pointer border-none bg-transparent ${showSettings ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-650'}`}
              title="Configurações da calculoteca"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setLocalMessages([])}
              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-md transition-colors cursor-pointer bg-transparent border-none"
              title="Nova conversa"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-md transition-colors cursor-pointer bg-transparent border-none hidden sm:inline-block"
              title="Maximizar painel"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setIsAskDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-md transition-colors cursor-pointer bg-transparent border-none"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Area */}
        {showSettings && (
          <div className="bg-slate-50 border-b border-slate-200 p-3.5 space-y-2 z-10 shrink-0 select-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Calculoteca</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Interactive Formula Builder */}
            <form onSubmit={handleCreateCalculatedField} className="border-t border-slate-200 pt-2.5 mt-2.5 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Criar Nova Métrica/Cálculo</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCalcLabel}
                  onChange={(e) => setNewCalcLabel(e.target.value)}
                  placeholder="Nome (ex: Meta EBITDA)"
                  className="col-span-2 bg-white border border-slate-250 rounded-lg text-[10px] font-semibold text-slate-850 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  required
                />
                
                <select
                  value={newCalcWorkspace}
                  onChange={(e) => {
                    const ws = e.target.value;
                    setNewCalcWorkspace(ws);
                    setNewCalcField(WORKSPACE_FIELDS[ws][0]);
                  }}
                  className="bg-white border border-slate-250 rounded-lg text-[10px] font-semibold text-slate-850 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="ws-1">Vendas (ws-1)</option>
                  <option value="ws-2">Shopee (ws-2)</option>
                  <option value="ws-3">CRM RFV (ws-3)</option>
                  <option value="ws-4">DRE Fin (ws-4)</option>
                </select>

                <select
                  value={newCalcField}
                  onChange={(e) => setNewCalcField(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-[10px] font-semibold text-slate-850 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  {WORKSPACE_FIELDS[newCalcWorkspace]?.map(fld => (
                    <option key={fld} value={fld}>{fld}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newCalcExpr}
                  onChange={(e) => setNewCalcExpr(e.target.value)}
                  placeholder="Modificador (ex: * 1.15)"
                  className="bg-white border border-slate-250 rounded-lg text-[10px] font-semibold text-slate-850 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  required
                />

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer border-none flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Criar Fórmula</span>
                </button>
              </div>
            </form>

            {/* Calculoteca List */}
            <div className="border-t border-slate-200 pt-2.5 mt-2.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Fórmulas em Memória (Calculoteca)</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {calculatedFields.map(cf => (
                  <div key={cf.id} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[9px]">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 block truncate">{cf.label}</span>
                      <span className="text-slate-400 font-mono block tracking-tight truncate">ID: {cf.id} | Base: {cf.workspaceId}</span>
                      <span className="text-slate-400 font-semibold block">Fórmula: <strong className="text-slate-650 font-mono bg-slate-50 px-1 py-0.25 rounded">{cf.sourceField} {cf.expression}</strong></span>
                    </div>
                    {/* Only show trash icon if it's not a core standard formula */}
                    {cf.id !== 'calc-previsao-vendas' && cf.id !== 'calc-shopee-comissao' && (
                      <button 
                        onClick={() => removeCalculatedField(cf.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer bg-transparent border-none shrink-0"
                        title="Remover fórmula da memória"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Conversation Pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Support Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-700">Need more help?</span>
            <button className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer">
              Support
            </button>
          </div>

          {/* Chat Content or Welcome Cards */}
          {localMessages.length === 0 ? (
            <div className="space-y-6">
              {/* Illustration and Salutation */}
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
                {/* Cloud/Sphere gradient SVG */}
                <div className="relative w-28 h-20 mb-6 flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-orange-400/20 blur-md"></div>
                  <div className="absolute w-10 h-10 rounded-full bg-orange-300 left-2 bottom-2 shadow-xs"></div>
                  <div className="absolute w-14 h-14 rounded-full bg-amber-400 left-8 top-1 shadow-xs"></div>
                  <div className="absolute w-8 h-8 rounded-full bg-orange-400 right-4 bottom-2 shadow-xs"></div>
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Good morning.</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-2.5 uppercase tracking-wider">What are we doing today?</p>
              </div>

              {/* Suggestions Cards */}
              <div className="space-y-2 max-w-sm mx-auto">
                {suggestions.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s.prompt)}
                      className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl text-left transition-all cursor-pointer group shadow-xs border-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{s.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal truncate max-w-[260px]">{s.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {localMessages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {isUser ? (
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                        U
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-slate-200" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div className="flex flex-col max-w-[80%]">
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs border ${
                        isUser 
                          ? 'bg-[#0f172a] border-slate-900 text-white rounded-tr-none font-semibold'
                          : 'bg-white border-slate-200 text-slate-800 rounded-tl-none font-medium'
                      }`}>
                        <p>{msg.text}</p>

                        {/* If dynamically generated module card is attached */}
                        {msg.moduleConfig && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between select-none mt-2.5">
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[10px] font-extrabold text-slate-800 leading-tight">Módulo Instalado</h4>
                                <p className="text-[9px] text-slate-400 font-semibold truncate max-w-[130px] mt-0.5">
                                  {msg.moduleConfig.label}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCurrentTab(msg.moduleConfig!.screens[0].id);
                                setIsAskDrawerOpen(false);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 ml-2 border-none"
                            >
                              Acessar
                            </button>
                          </div>
                        )}
                      </div>
                      <span className={`text-[8px] text-slate-400 font-semibold mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-slate-200" />
                  </div>
                  <div className="bg-white border border-slate-200/80 px-3 py-2.5 rounded-2xl rounded-tl-none shadow-xs flex items-center space-x-1.5 h-8">
                    <div className="w-1.5 h-1.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar - Cloudflare Style */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0 z-10">
          <div className="relative flex flex-col bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/5 rounded-2xl p-2 transition-all">
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="What can we help you with?"
              className="w-full max-h-24 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-xs sm:text-sm px-3 focus:outline-none resize-none align-middle pt-1 pb-1"
            />
            <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 px-2 mt-1.5 shrink-0">
              {/* Ask button (left) */}
              <button 
                onClick={() => handleSendMessage()}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Ask</span>
              </button>
              
              {/* Actions and send button (right) */}
              <div className="flex items-center space-x-2">
                <button 
                  className="p-1 hover:bg-slate-200/40 text-slate-400 hover:text-slate-650 rounded-md transition-colors cursor-pointer border-none bg-transparent"
                  title="Mapear opções"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="h-6 w-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 border-none"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
