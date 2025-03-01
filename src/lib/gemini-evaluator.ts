/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { InterviewTopic } from "../contexts/LiveAPIContext";
import { ConversationMessage, InterviewSession } from "../services/InterviewTrackingService";
import { InterviewFeedback, FeedbackScore } from "../components/feedback-scorecard/FeedbackScorecard";

// Base URL for the proxy to Gemini API (this would be the real API endpoint in production)
const API_URL = '/api/gemini-evaluate';

interface EvaluationRequest {
  topic: InterviewTopic;
  messages: ConversationMessage[];
  evaluationCategories: string[];
}

interface CategoryEvaluation {
  category: string;
  score: number;
  feedback: string;
  improvementTips: string[];
  notCovered: boolean;
}

interface EvaluationResponse {
  overallScore: number;
  overallFeedback: string;
  categoryEvaluations: CategoryEvaluation[];
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}

/**
 * Generate a structured prompt for Gemini to evaluate the interview
 */
function generateEvaluationPrompt(session: InterviewSession): string {
  const categoryList = getCategoriesForTopic(session.topic.id).join(', ');
  const topicDetails = `Topic: ${session.topic.title}\nDescription: ${session.topic.description}`;
  
  // Format the conversation as a readable transcript
  const transcript = session.messages.map(msg => {
    return `${msg.role.toUpperCase()}: ${msg.content}`;
  }).join('\n\n');
  
  return `You are an expert interview evaluator for ${session.topic.title} positions.
  
TASK:
Evaluate the following interview transcript and provide detailed feedback.

INTERVIEW DETAILS:
${topicDetails}
Evaluation Categories: ${categoryList}

TRANSCRIPT:
${transcript}

EVALUATION INSTRUCTIONS:
1. Score each category from 0-100 based on the candidate's performance
2. Provide specific feedback for each category
3. Identify key strengths and weaknesses with examples from the transcript
4. Evaluate only categories that were actually covered in the interview
5. Mark categories as "not covered" if they weren't substantially discussed
6. Calculate an overall score as the average of covered categories only

Your evaluation should be honest, constructive, and specific to what was discussed.`;
}

/**
 * Get evaluation categories for a specific topic
 */
function getCategoriesForTopic(topicId: string): string[] {
  switch(topicId) {
    case 'software-engineering':
      return ['Technical Knowledge', 'Problem Solving', 'Code Quality', 'System Design', 'Communication'];
    case 'product-management':
      return ['Product Strategy', 'User Insights', 'Prioritization', 'Cross-functional Collaboration', 'Communication'];
    case 'data-science':
      return ['Statistical Knowledge', 'Data Manipulation', 'Machine Learning', 'Problem Analysis', 'Communication'];
    case 'ux-design':
      return ['Design Thinking', 'User Research', 'Visual Design', 'Prototyping', 'Communication'];
    case 'leadership':
      return ['Strategic Thinking', 'Team Management', 'Decision Making', 'Conflict Resolution', 'Communication'];
    default:
      return ['Subject Knowledge', 'Critical Thinking', 'Communication', 'Problem Solving', 'Adaptability'];
  }
}

/**
 * For development/demo purposes - simulate an API response 
 * This would be replaced with an actual API call in production
 */
async function mockEvaluationResponse(request: EvaluationRequest): Promise<EvaluationResponse> {
  // Get user message count as a proxy for interview quality
  const userMessages = request.messages.filter(msg => msg.role === 'user');
  const messageCount = userMessages.length;
  
  // Calculate a base score correlated with message count
  // More messages generally indicate a more thorough interview
  const baseScore = Math.min(95, Math.max(70, 65 + messageCount * 2));
  
  // Simulate category evaluations
  const categoryEvaluations: CategoryEvaluation[] = request.evaluationCategories.map((category, index) => {
    // Simulate some categories as covered or not based on message count
    // In a real implementation, this would be determined by content analysis
    const isCovered = messageCount > (3 + index % 2);
    
    // Add some variation to scores
    const variation = Math.floor(Math.random() * 10) - 5;
    const score = isCovered ? 
      Math.min(100, Math.max(65, baseScore + variation)) : 
      0;
    
    return {
      category,
      score: score,
      feedback: isCovered ? 
        `Your ${category.toLowerCase()} was ${getScoreDescription(score)}.` :
        `This category wasn't covered in your interview.`,
      improvementTips: [
        `Practice more ${category.toLowerCase()} questions.`,
        `Research common ${category.toLowerCase()} scenarios for this role.`,
        `Prepare specific examples related to ${category.toLowerCase()}.`
      ],
      notCovered: !isCovered
    };
  });
  
  // Calculate overall score from only covered categories
  const coveredCategories = categoryEvaluations.filter(cat => !cat.notCovered);
  const overallScore = coveredCategories.length > 0 ?
    Math.floor(coveredCategories.reduce((sum, cat) => sum + cat.score, 0) / coveredCategories.length) :
    75;
  
  // Generate strengths and weaknesses
  const strengths = coveredCategories
    .filter(cat => cat.score >= 85)
    .map(cat => `Strong ${cat.category.toLowerCase()} skills demonstrated in your responses.`);
  
  const weaknesses = coveredCategories
    .filter(cat => cat.score < 80)
    .map(cat => `Room for improvement in ${cat.category.toLowerCase()}.`);
  
  // Add mention of uncovered categories
  const uncoveredCategories = categoryEvaluations.filter(cat => cat.notCovered);
  if (uncoveredCategories.length > 0) {
    const uncoveredNames = uncoveredCategories.map(cat => cat.category.toLowerCase()).join(', ');
    weaknesses.push(`The interview didn't adequately cover: ${uncoveredNames}.`);
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    overallScore,
    overallFeedback: `Your overall performance was ${getScoreDescription(overallScore)} for a ${request.topic.title} role.`,
    categoryEvaluations,
    strengths: strengths.length > 0 ? strengths : ["You showed good potential in this interview."],
    weaknesses: weaknesses.length > 0 ? weaknesses : ["Continue practicing all aspects of interviewing."],
    nextSteps: [
      "Review specific feedback for each category",
      "Practice questions in weaker areas",
      "Research common interview questions for this role",
      "Try another practice interview focusing on uncovered topics"
    ]
  };
}

/**
 * Helper function to describe scores
 */
function getScoreDescription(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'very good';
  if (score >= 75) return 'good';
  if (score >= 70) return 'adequate';
  return 'developing';
}

/**
 * Send the interview transcript to Gemini for evaluation
 */
export async function evaluateInterview(session: InterviewSession): Promise<InterviewFeedback | null> {
  try {
    if (!session) return null;
    
    const categories = getCategoriesForTopic(session.topic.id);
    
    // Prepare the request
    const request: EvaluationRequest = {
      topic: session.topic,
      messages: session.messages,
      evaluationCategories: categories
    };
    
    // In an actual implementation, this would call the Gemini API
    // For this demo, we'll use a mock implementation
    console.log("Sending interview for evaluation:", request);
    
    // This would be replaced with a real API call
    // const response = await fetch(API_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request)
    // });
    // const data = await response.json();
    
    const data = await mockEvaluationResponse(request);
    
    // Convert API response to our feedback format
    const feedback: InterviewFeedback = {
      overallScore: data.overallScore,
      overallFeedback: data.overallFeedback,
      categoryScores: data.categoryEvaluations.map(cat => ({
        category: cat.category,
        score: cat.score,
        feedback: cat.feedback,
        improvementTips: cat.improvementTips,
        notCovered: cat.notCovered
      })),
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      nextSteps: data.nextSteps
    };
    
    console.log("Evaluation complete:", feedback);
    return feedback;
    
  } catch (error) {
    console.error("Error evaluating interview:", error);
    return null;
  }
} 