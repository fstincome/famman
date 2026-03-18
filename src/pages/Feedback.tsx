import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Star, 
  Bug, 
  Lightbulb, 
  Heart,
  ThumbsUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

const Feedback = () => {
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);

  const feedbackTypes = [
    { id: "general", label: "General Feedback", icon: MessageSquare },
    { id: "bug", label: "Bug Report", icon: Bug },
    { id: "feature", label: "Feature Request", icon: Lightbulb },
    { id: "compliment", label: "Compliment", icon: Heart },
  ];

  const recentFeedback = [
    {
      id: 1,
      type: "Feature Request",
      title: "Dark mode for mobile app",
      status: "In Progress",
      date: "2 days ago",
      votes: 23
    },
    {
      id: 2,
      type: "Bug Report",
      title: "Export CSV formatting issue",
      status: "Fixed",
      date: "1 week ago",
      votes: 8
    },
    {
      id: 3,
      type: "General",
      title: "Love the new dashboard design!",
      status: "Acknowledged",
      date: "2 weeks ago",
      votes: 45
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Fixed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "In Progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "Acknowledged":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Fixed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Fixed</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case "Acknowledged":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Acknowledged</Badge>;
      default:
        return <Badge variant="secondary">New</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve FinanceFlow by sharing your thoughts, reporting bugs, or suggesting new features
        </p>
      </div>

      {/* Feedback Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixed Issues</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4h</div>
            <p className="text-xs text-muted-foreground">Average response</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submit Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>
              We value your input and read every piece of feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="feedback-type">Feedback Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {feedbackTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={feedbackType === type.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedbackType(type.id)}
                    className="justify-start"
                  >
                    <type.icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Brief description of your feedback" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="rating">Rate your experience (optional)</Label>
              <div className="flex space-x-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Please provide detailed feedback..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" placeholder="your@email.com" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                We'll only use this to follow up on your feedback
              </p>
            </div>

            <Button className="w-full">Submit Feedback</Button>
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Community Feedback</CardTitle>
            <CardDescription>
              See what others are saying and vote on existing feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFeedback.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(feedback.status)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground">
                          {feedback.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {feedback.type}
                          </Badge>
                          {getStatusBadge(feedback.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {feedback.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {feedback.votes}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;