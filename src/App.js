"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import {
  AlertTriangle,
  BarChart3,
  TrendingUp,
  MapPin,
  Calendar,
  PieChart,
  Navigation,
  FileText,
  Settings,
  Users,
  Target,
  Clock,
  DollarSign,
  Activity,
  Zap,
  Bell,
  RefreshCw,
} from "lucide-react"

// Mock data for demonstration
const mockMRData = [
  {
    id: 1,
    name: "John Smith",
    employee_id: "MR001",
    territory: "North Zone",
    monthly_target: 150000,
    manager_name: "Sarah Johnson",
    joining_date: "2023-01-15",
  },
  {
    id: 2,
    name: "Emily Davis",
    employee_id: "MR002",
    territory: "South Zone",
    monthly_target: 180000,
    manager_name: "Mike Wilson",
    joining_date: "2023-02-20",
  },
  {
    id: 3,
    name: "Michael Brown",
    employee_id: "MR003",
    territory: "East Zone",
    monthly_target: 160000,
    manager_name: "Lisa Chen",
    joining_date: "2023-03-10",
  },
]

const tabsConfig = [
  {
    id: "emergency",
    name: "Emergency",
    icon: AlertTriangle,
    description: "Critical alerts & fixes",
    color: "destructive",
  },
  {
    id: "quality",
    name: "Quality",
    icon: BarChart3,
    description: "Visit quality monitoring",
    color: "default",
  },
  {
    id: "performance",
    name: "Performance",
    icon: TrendingUp,
    description: "NBD performance tracking",
    color: "default",
  },
  {
    id: "routes",
    name: "Routes",
    icon: Navigation,
    description: "Route optimization",
    color: "default",
  },
  {
    id: "planning",
    name: "Planning",
    icon: Calendar,
    description: "Monthly planning",
    color: "default",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: PieChart,
    description: "Advanced insights",
    color: "default",
  },
  {
    id: "geocoding",
    name: "Geocoding",
    icon: MapPin,
    description: "GPS management",
    color: "default",
  },
  {
    id: "reports",
    name: "Reports",
    icon: FileText,
    description: "Detailed reports",
    color: "default",
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    description: "Configuration",
    color: "default",
  },
]

export default function ModernAnalyticsDashboard() {
  const [selectedMR, setSelectedMR] = useState("all")
  const [activeTab, setActiveTab] = useState("emergency")
  const [isLoading, setIsLoading] = useState(false)

  const selectedMRData = mockMRData.find((mr) => mr.employee_id === selectedMR)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Kairali Analytics</h1>
                  <p className="text-sm text-gray-500">Field Sales Intelligence</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <Select value={selectedMR} onValueChange={setSelectedMR}>
                  <SelectTrigger className="w-48 border-gray-200">
                    <SelectValue placeholder="Select MR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MRs ({mockMRData.length})</SelectItem>
                    {mockMRData.map((mr) => (
                      <SelectItem key={mr.id} value={mr.employee_id}>
                        {mr.name} ({mr.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Bell className="w-4 h-4" />
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                  3
                </Badge>
              </Button>
            </div>
          </div>

          {/* MR Info Bar */}
          {selectedMRData && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Territory:</span>
                  <span className="font-semibold text-gray-900">{selectedMRData.territory}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Target:</span>
                  <span className="font-semibold text-gray-900">₹{selectedMRData.monthly_target.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">Manager:</span>
                  <span className="font-semibold text-gray-900">{selectedMRData.manager_name}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Modern Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <TabsList className="grid w-full grid-cols-9 gap-1 bg-transparent p-0">
              {tabsConfig.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
                  >
                    <IconComponent className="w-5 h-5" />
                    <div className="text-center">
                      <div className="font-medium text-xs">{tab.name}</div>
                      <div className="text-xs text-gray-500 hidden lg:block">{tab.description}</div>
                    </div>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="emergency" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 mb-2">7</div>
                  <p className="text-sm text-red-600">Territories need immediate attention</p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-700 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Short Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-2">23</div>
                  <p className="text-sm text-orange-600">Visits under 2 minutes</p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-yellow-700 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Zero ROI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">12</div>
                  <p className="text-sm text-yellow-600">Visits with no outcome</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Territory Analysis</CardTitle>
                <CardDescription>Territories requiring immediate intervention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { territory: "North Zone A", mr: "John Smith", issue: "Low visit duration", severity: "high" },
                    { territory: "South Zone B", mr: "Emily Davis", issue: "Zero ROI visits", severity: "medium" },
                    { territory: "East Zone C", mr: "Michael Brown", issue: "Missed targets", severity: "high" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={item.severity === "high" ? "destructive" : "secondary"}>
                          {item.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{item.territory}</div>
                          <div className="text-sm text-gray-500">
                            {item.mr} • {item.issue}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Visit Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">8.4/10</div>
                  <p className="text-sm text-gray-600">Average quality across all visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Avg Visit Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">18m</div>
                  <p className="text-sm text-gray-600">Optimal range: 15-25 minutes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Quality Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">+12%</div>
                  <p className="text-sm text-gray-600">Improvement this month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quality Monitoring Dashboard</CardTitle>
                <CardDescription>Real-time visit quality analysis and suspicious activity detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Quality analytics visualization will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    NBD Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">73%</div>
                  <p className="text-sm text-green-600">New business conversion</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Target Achievement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">89%</div>
                  <p className="text-sm text-blue-600">Monthly target progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-700 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Revenue per Visit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">₹2.4K</div>
                  <p className="text-sm text-purple-600">Average revenue generated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-700 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Active Prospects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-2">156</div>
                  <p className="text-sm text-orange-600">In pipeline</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>NBD Performance Analytics</CardTitle>
                <CardDescription>New business development tracking and conversion analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Performance charts and analytics will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder content for other tabs */}
          {["routes", "planning", "analytics", "geocoding", "reports", "settings"].map((tabId) => (
            <TabsContent key={tabId} value={tabId} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(tabsConfig.find((t) => t.id === tabId)?.icon || Settings, {
                      className: "w-5 h-5",
                    })}
                    {tabsConfig.find((t) => t.id === tabId)?.name} Dashboard
                  </CardTitle>
                  <CardDescription>{tabsConfig.find((t) => t.id === tabId)?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <div className="text-center">
                      {React.createElement(tabsConfig.find((t) => t.id === tabId)?.icon || Settings, {
                        className: "w-12 h-12 text-gray-400 mx-auto mb-4",
                      })}
                      <p className="text-gray-500">{tabsConfig.find((t) => t.id === tabId)?.name} module coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Modern Status Bar */}
      <footer className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-6 py-3">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Live Database Connected</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              {selectedMR === "all" ? `Viewing all ${mockMRData.length} MRs` : `Active: ${selectedMRData?.name}`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">Kairali Analytics v3.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
