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
import { AnimatePresence, motion } from "framer-motion"
import { Sun, Moon, Send, Loader2, Save, Download, RotateCcw, Settings, Plus, Minus, Volume2, Heart } from "lucide-react"

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

// 型定義を追加
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

const agents: AgentConfig[] = [
  {
    name: "Expert A",
    role: "Financial Analyst",
    apiEndpoint: process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT_A,
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_A
  },
  {
    name: "Expert B",
    role: "Risk Manager",
    apiEndpoint: process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT_B,
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_B
  },
  {
    name: "Expert C",
    role: "Investment Strategist",
    apiEndpoint: process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT_C,
    apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY_C
  }
];

const initialAIAgents: AIAgent[] = [
  { id: 1, name: "自然言語処理専門家A", expertise: "自然言語処理", avatar: "/placeholder.svg?height=40&width=40", isActive: true, likes: 87 },
  { id: 2, name: "データサイエンティストB", expertise: "データサイエンス", avatar: "/placeholder.svg?height=40&width=40", isActive: true, likes: 65 },
  { id: 3, name: "プロジェクトマネージャーC", expertise: "プロジェクト管理", avatar: "/placeholder.svg?height=40&width=40", isActive: true, likes: 92 },
]

// sendMessageToAgent関数を追加
const sendMessageToAgent = async (message: string, agent: AgentConfig): Promise<string> => {
  try {
    const response = await fetch(agent.apiEndpoint!, {  // !を追加して型エラーを解消
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agent.apiKey!}`,  // !を追加
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: 'blocking',
        user: `user-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data: DifyResponse = await response.json();
    return data.answer;
  } catch (error) {
    console.error(`${agent.name}からの応答でエラーが発生:`, error);
    return `${agent.name}からの応答中にエラーが発生しました。`;
  }
};

export function EnhancedMultiAgentDiscussionInterfaceComponent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [aiAgents, setAIAgents] = useState<AIAgent[]>(initialAIAgents)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // handleSendMessageを更新
  const handleSendMessage = async () => {
    if (inputMessage.trim() !== "") {
      try {
        const newMessage: Message = {
          id: messages.length + 1,
          sender: "ユーザー",
          content: inputMessage,
          timestamp: new Date(),
        };
        setMessages([...messages, newMessage]);
        setInputMessage("");
        setIsLoading(true);

        // アクティブな専門家全員から回答を取得
        const activeAgents = agents.filter((_, index) => 
          aiAgents[index].isActive
        );

        // 全ての専門家からの応答を並行して取得
        const responses = await Promise.all(
          activeAgents.map(agent => sendMessageToAgent(inputMessage, agent))
        );

        // 各専門家の応答をメッセージとして追加
        responses.forEach((response, index) => {
          const aiMessage: Message = {
            id: messages.length + 2 + index,
            sender: activeAgents[index].name,
            content: response,
            timestamp: new Date(),
          };
          setMessages(prevMessages => [...prevMessages, aiMessage]);

          // 音声読み上げが有効な場合
          if (isSpeechEnabled) {
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.lang = 'ja-JP';
            speechSynthesis.speak(utterance);
          }
        });

      } catch (error) {
        console.error("エラーが発生しました:", error);
        const errorMessage: Message = {
          id: messages.length + 2,
          sender: "システム",
          content: "申し訳ありません。エラーが発生しました。",
          timestamp: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
                      <Badge variant="secondary" className="mt-1">{agent.expertise}</Badge>
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
                    variant="ghost"
                    size="sm"
                    className="p-0 hover:bg-transparent"
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
                <Button onClick={resetConversation} variant="destructive" className="w-full">
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
                  <span>自動保存</span>
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
                エージェントの追加/削除やその他の設定を行います。
              </p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Button size="sm" className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="col-span-2">新規エージェント追加</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Button size="sm" className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="col-span-2">エージェント削除</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Button size="sm" className="h-8  w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <span className="col-span-2">音声設定</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
