'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Send, Loader2, Save, Download, RotateCcw, Settings, Plus, Minus, Volume2, Heart } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';  // ファイルの先頭に追加

type Message = {
  id: number
  sender: string
  content: string
  timestamp: Date
}

type AIAgent = {
  id: number
  name: string
  expertise: string
  avatar: string
  isActive: boolean
  likes: number
}

// 型定義追加
type DifyResponse = {
    answer: string;
    conversation_id: string;
    message_id: string;
}

interface AgentConfig {
  name: string;
  role: string;
  apiEndpoint: string; // dify APIのエンドポイントを追加
  apiKey: string;      // dify APIキーを追加
}

// エラー型の定義を追加
interface APIError extends Error {
  message: string;
}

// agents の定義を修正
const agents: AgentConfig[] = [
  {
    name: "自然言語処理専門家A",
    role: "Financial Analyst",
    apiEndpoint: "https://api.dify.ai/v1/chat-messages",  // 正しいエンドポイント
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_A || ''
  },
  {
    name: "データサイエンティストB",
    role: "Risk Manager",
    apiEndpoint: "https://api.dify.ai/v1/chat-messages",  // 正しいエンドポイント
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_B || ''
  },
  {
    name: "プロジェクトマネージャーC",
    role: "Investment Strategist",
    apiEndpoint: "https://api.dify.ai/v1/chat-messages",  // 正しいエンドポイント
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_C || ''
  }
];

const initialAIAgents: AIAgent[] = [
  { 
    id: 1, 
    name: "自然言語処理専門A", 
    expertise: "自然言語処理", 
    avatar: "", // 空文字列に変更
    isActive: true, 
    likes: 87 
  },
  { 
    id: 2, 
    name: "データサイエンティストB", 
    expertise: "データサイエンス", 
    avatar: "", // 空文字列に変更
    isActive: true, 
    likes: 65 
  },
  { 
    id: 3, 
    name: "プロジェクトマネージャーC", 
    expertise: "プロジェクト管理", 
    avatar: "", // 空文字列に変更
    isActive: true, 
    likes: 92 
  },
]

export function EnhancedMultiAgentDiscussionInterfaceComponent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [aiAgents, setAIAgents] = useState<AIAgent[]>(initialAIAgents)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);

  // ユーティリティ関数
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // sendMessageToAgent関数をここに移動
  const sendMessageToAgent = async (message: string, agent: AgentConfig): Promise<string> => {
    console.log('Agent Config:', agent);

    if (!agent.apiKey) {
      throw new Error(`${agent.name}のAPIキーが設定されていません`);
    }

    try {
      const response = await fetch('/api/dify-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: agent.apiKey,
          query: message,
          user: "default-user",
          response_mode: "blocking",
          inputs: {}
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', errorData);
        throw new Error(`APIエラー: ${response.status} - ${errorData.message || '不明なエラー'}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.answer) {
        return data.answer;
      } else if (data.message?.content) {
        return data.message.content;
      } else if (data.response) {
        return data.response;
      } else if (data.text) {
        return data.text;
      } else {
        console.error('Unexpected API response:', data);
        return `${agent.name}からの応答を解析できませんでした。`;
      }
    } catch (error) {
      console.error(`${agent.name}のAPI呼び出しの詳細エラー:`, error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return `${agent.name}との接続に失敗しました。インターネット接続を確認してください。`;
      }
      const apiError = error as APIError;
      return `${agent.name}との通信中にエラー: ${apiError.message}`;
    }
  };

  // handleSendMessage関数をここに移動
  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;

    try {
      setIsLoading(true);
      setError(null);

      const newMessage: Message = {
        id: messages.length + 1,
        sender: "ユーザー",
        content: inputMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setInputMessage("");

      const activeAgents = agentConfigs.filter((_, index) => aiAgents[index].isActive);

      // エージェントごとに順番に処理
      for (const agent of activeAgents) {
        try {
          // 各エージェントのリクエスト前に3秒待機
          await sleep(3000);
          
          console.log(`${agent.name}に送信中...`);
          const response = await sendMessageToAgent(inputMessage, agent);
          
          const aiMessage: Message = {
            id: Date.now(),
            sender: agent.name,
            content: response,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);

          if (isSpeechEnabled) {
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.lang = 'ja-JP';
            speechSynthesis.speak(utterance);
          }

        } catch (error) {
          const apiError = error as APIError;
          console.error(`${agent.name}からの応答でエラー:`, apiError);
          
          if (apiError.message.includes('Rate Limit Error')) {
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender: "システム",
              content: `${agent.name}へのリクエストが制限されました。10秒後に再試行します...`,
              timestamp: new Date(),
            }]);
            
            // レート制限時は10秒待機してから再試行
            await sleep(10000);
            try {
              const retryResponse = await sendMessageToAgent(inputMessage, agent);
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: agent.name,
                content: retryResponse,
                timestamp: new Date(),
              }]);
            } catch (retryError) {
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: "システム",
                content: `${agent.name}への再試行も失敗しました。しばらく待ってから試してください。`,
                timestamp: new Date(),
              }]);
            }
          } else {
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender: "システム",
              content: apiError.message || `${agent.name}からの応答中にエラーが発生しました`,
              timestamp: new Date(),
            }]);
          }
        }
      }
    } catch (error) {
      const apiError = error as APIError;
      console.error("エラーが発生しました:", apiError);
      setError(apiError.message || "メッセージの送信中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // 環境変数の読み込み
  useEffect(() => {
    setAgentConfigs([
      {
        name: "自然言語処理専門家A",
        role: "Financial Analyst",
        apiEndpoint: "https://api.dify.ai/v1/chat-messages",
        apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_A || ''
      },
      {
        name: "データサイエンティストB",
        role: "Risk Manager",
        apiEndpoint: "https://api.dify.ai/v1/chat-messages",
        apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_B || ''
      },
      {
        name: "プロジェクトマネージャーC",
        role: "Investment Strategist",
        apiEndpoint: "https://api.dify.ai/v1/chat-messages",
        apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_C || ''
      }
    ]);
  }, []);

  // コンポーネントの先頭で環境変数をログ出力
  useEffect(() => {
    console.log('環境変数の確認:');
    console.log('API_KEY_A:', process.env.NEXT_PUBLIC_DIFY_API_KEY_A);
    console.log('API_KEY_B:', process.env.NEXT_PUBLIC_DIFY_API_KEY_B);
    console.log('API_KEY_C:', process.env.NEXT_PUBLIC_DIFY_API_KEY_C);
  }, []);

  // コンポーネントのuseEffect内
  useEffect(() => {
    console.log('API Keys:', {
      A: process.env.NEXT_PUBLIC_DIFY_API_KEY_A,
      B: process.env.NEXT_PUBLIC_DIFY_API_KEY_B,
      C: process.env.NEXT_PUBLIC_DIFY_API_KEY_C
    });
  }, []);

  const toggleAgentActive = (agentId: number) => {
    setAIAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, isActive: !agent.isActive } : agent
      )
    )
  }

  const incrementLikes = (agentId: number) => {
    setAIAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, likes: agent.likes + 1 } : agent
      )
    )
  }

  const saveConversation = () => {
    // Implement save functionality
    console.log("会話を保存しました")
  }

  const exportConversation = () => {
    const conversationText = messages.map(m => `${m.sender}: ${m.content}`).join('\n')
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conversation.txt'
    a.click()
  }

  const resetConversation = () => {
    setMessages([])
  }

  // 音声設定の追加
  const handleSpeech = (text: string) => {
    if (!isSpeechEnabled) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    speechSynthesis.speak(utterance)
  }

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
        <h1 className="text-3xl font-bold">マルチエージェントとの議論</h1>
        <div className="flex items-center space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isDarkMode ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r dark:border-gray-700 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">AIエージェント</h2>
          {aiAgents.map((agent) => (
            <Card key={agent.id} className="mb-4 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={agent.avatar} alt={agent.name} />
                      <AvatarFallback>{agent.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <Badge className="mt-1 bg-secondary text-white">{agent.expertise}</Badge>
                    </div>
                  </div>
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={() => toggleAgentActive(agent.id)}
                    aria-label={`${agent.name}を切り替え`}
                  />
                </div>
                <div className="mt-2 flex items-center">
                  <Button
                    className="p-0 hover:bg-transparent ghost"
                    onClick={() => incrementLikes(agent.id)}
                  >
                    <Heart className="h-4 w-4 text-red-500 mr-1" />
                  </Button>
                  <span className="text-sm font-medium">{agent.likes}</span>
                </div>
                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-indigo-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                  人気
                </div>
              </CardContent>
            </Card>
          ))}
        </aside>
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-4 ${message.sender === "ユザー" ? "text-right" : "text-left"}`}
                >
                  <div className={`inline-block p-3 rounded-lg ${message.sender === "ユーザー" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                    <p className="font-bold">{message.sender}</p>
                    <p className="break-words">{message.content}</p>
                    <p className="text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="メッセージを入力してください..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading} className="bg-blue-500 hover:bg-blue-600 text-white">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </main>
        <aside className="w-80 border-l dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">アクション</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>
            <TabsContent value="actions">
              <div className="space-y-4">
                <Button onClick={saveConversation} className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <Save className="mr-2 h-4 w-4" /> 会話を保存
                </Button>
                <Button onClick={exportConversation} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                  <Download className="mr-2 h-4 w-4" /> 会話をエクスポート
                </Button>
                <Button onClick={resetConversation} className="w-full bg-red-500 hover:bg-red-600 text-white">
                  <RotateCcw className="mr-2 h-4 w-4" /> 会話をリセット
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="settings">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>通知</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span>動保存</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span>音声読み上げ</span>
                  <Switch
                    checked={isSpeechEnabled}
                    onCheckedChange={setIsSpeechEnabled}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg bg-purple-600 hover:bg-purple-700 text-white">
            <Settings className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">クイック設</h4>
              <p className="text-sm text-muted-foreground">
                エージェントの追加/除やその他の設定を行います。
              </p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Button className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="col-span-2">新規エージェント追加</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Button className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="col-span-2">エージェント削除</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Button className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <span className="col-span-2">音声設定</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  )
}
