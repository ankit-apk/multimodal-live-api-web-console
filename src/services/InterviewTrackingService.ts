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
import { FeedbackScore, InterviewFeedback } from "../components/feedback-scorecard/FeedbackScorecard";
import { evaluateInterview } from "../lib/gemini-evaluator";

export interface ConversationMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  category?: string; // Optional category classifier 
}

export interface InterviewSession {
  topic: InterviewTopic;
  startTime: number;
  endTime: number | null;
  duration: number;
  messages: ConversationMessage[];
  aiEvaluation?: any; // Store the AI evaluation results
}

// Keywords related to each interview topic
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'software-engineering': [
    'algorithm', 'code', 'testing', 'design pattern', 'architecture', 'database', 
    'complexity', 'performance', 'scalability', 'framework', 'library', 'api',
    'object-oriented', 'functional', 'agile', 'git', 'cloud', 'devops'
  ],
  'product-management': [
    'user', 'customer', 'market', 'stakeholder', 'roadmap', 'strategy', 'kpi', 'metric',
    'prioritization', 'feature', 'requirement', 'release', 'budget', 'timeline',
    'competition', 'analysis', 'research', 'value', 'vision', 'objective'
  ],
  'data-science': [
    'model', 'algorithm', 'visualization', 'statistic', 'analysis', 'machine learning',
    'dataset', 'prediction', 'correlation', 'causation', 'hypothesis', 'insight',
    'regression', 'classification', 'clustering', 'neural network', 'feature', 'bias'
  ],
  'ux-design': [
    'user', 'interface', 'experience', 'wireframe', 'prototype', 'usability', 'testing',
    'persona', 'journey', 'research', 'accessibility', 'design system', 'user flow',
    'iteration', 'feedback', 'heuristic', 'interaction', 'visual design'
  ],
  'leadership': [
    'team', 'manage', 'delegate', 'vision', 'strategy', 'motivate', 'mentor',
    'feedback', 'conflict', 'decision', 'responsibility', 'communication', 
    'growth', 'challenge', 'goal', 'performance', 'initiative', 'culture'
  ]
};

// Keywords related to each category across topics
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Technical categories
  'technical knowledge': [
    'programming language', 'framework', 'technology', 'experience with', 'familiar with',
    'proficient in', 'expertise', 'technical skills', 'technical background'
  ],
  'problem solving': [
    'solve', 'approach', 'solution', 'challenge', 'difficult', 'complex', 'overcome',
    'address', 'resolve', 'debug', 'troubleshoot', 'fix', 'implement'
  ],
  'code quality': [
    'clean code', 'maintainable', 'readable', 'testable', 'reusable', 'modular',
    'pattern', 'principle', 'practice', 'standard', 'convention', 'documentation'
  ],
  'system design': [
    'architecture', 'system', 'scale', 'design', 'structure', 'component', 'module',
    'interface', 'integration', 'infrastructure', 'deployment', 'microservice'
  ],
  
  // Product categories
  'product strategy': [
    'vision', 'roadmap', 'strategy', 'objective', 'goal', 'direction', 'plan',
    'opportunity', 'market', 'competitor', 'competitive', 'positioning', 'landscape'
  ],
  'user insights': [
    'user', 'customer', 'research', 'feedback', 'interview', 'survey', 'usability',
    'testing', 'need', 'want', 'pain point', 'behavior', 'journey', 'experience'
  ],
  'prioritization': [
    'prioritize', 'priority', 'important', 'urgent', 'critical', 'value', 'impact',
    'effort', 'cost', 'benefit', 'trade-off', 'decision', 'criteria', 'framework'
  ],
  'cross-functional collaboration': [
    'team', 'collaborate', 'stakeholder', 'partner', 'engage', 'coordinate', 'align',
    'communication', 'interaction', 'relationship', 'cross-functional', 'work with'
  ],
  
  // Data science categories
  'statistical knowledge': [
    'statistics', 'statistical', 'probability', 'distribution', 'hypothesis', 'test',
    'significance', 'correlation', 'regression', 'analysis', 'statistical model'
  ],
  'data manipulation': [
    'data', 'dataset', 'database', 'sql', 'query', 'clean', 'preprocess', 'transform',
    'feature', 'extraction', 'engineering', 'pandas', 'etl', 'pipeline'
  ],
  'machine learning': [
    'model', 'algorithm', 'train', 'training', 'validation', 'test', 'accuracy',
    'precision', 'recall', 'classification', 'regression', 'clustering', 'deep learning'
  ],
  'problem analysis': [
    'analyze', 'analysis', 'insight', 'interpret', 'inference', 'conclusion', 'finding',
    'recommend', 'recommendation', 'action', 'decision', 'evidence', 'data-driven'
  ],
  
  // UX design categories
  'design thinking': [
    'empathize', 'define', 'ideate', 'prototype', 'test', 'user-centered', 'human-centered',
    'design process', 'design method', 'workshop', 'brainstorm', 'creative'
  ],
  'user research': [
    'interview', 'survey', 'observation', 'usability test', 'user testing', 'participant',
    'recruit', 'screener', 'research plan', 'research question', 'qualitative', 'quantitative'
  ],
  'visual design': [
    'visual', 'aesthetic', 'layout', 'grid', 'typography', 'color', 'icon', 'imagery',
    'illustration', 'graphic', 'style guide', 'design system', 'consistency'
  ],
  'prototyping': [
    'prototype', 'wireframe', 'mockup', 'fidelity', 'interactive', 'clickable', 'tool',
    'sketch', 'figma', 'adobe xd', 'invision', 'iteration', 'test', 'feedback'
  ],
  
  // Leadership categories
  'strategic thinking': [
    'strategy', 'vision', 'mission', 'objective', 'goal', 'direction', 'future',
    'planning', 'anticipate', 'proactive', 'long-term', 'big picture'
  ],
  'team management': [
    'manage', 'lead', 'team', 'direct', 'supervise', 'oversee', 'delegate', 'assign',
    'responsibility', 'accountability', 'performance', 'review', 'feedback'
  ],
  'decision making': [
    'decision', 'decide', 'choice', 'option', 'alternative', 'criteria', 'judgment',
    'impact', 'consequence', 'risk', 'uncertainty', 'trade-off', 'prioritize'
  ],
  'conflict resolution': [
    'conflict', 'disagreement', 'dispute', 'tension', 'resolution', 'resolve', 'mediate',
    'negotiate', 'compromise', 'solution', 'perspective', 'viewpoint'
  ],
  
  // Common categories
  'communication': [
    'communicate', 'explain', 'articulate', 'present', 'presentation', 'write', 'written',
    'verbal', 'express', 'clarity', 'concise', 'audience', 'message', 'listening'
  ],
  'adaptability': [
    'adapt', 'flexible', 'change', 'adjust', 'evolve', 'learn', 'grow', 'respond',
    'agile', 'resilient', 'versatile', 'open-minded', 'receptive'
  ]
};

// Default keywords for any topic
const DEFAULT_KEYWORDS = [
  'experience', 'skill', 'project', 'challenge', 'solution', 'learn',
  'improve', 'example', 'strength', 'weakness', 'success', 'failure',
  'teamwork', 'communication', 'collaboration', 'problem', 'approach', 'result'
];

class InterviewTrackingService {
  private static instance: InterviewTrackingService;
  private currentSession: InterviewSession | null = null;
  private sessionHistory: InterviewSession[] = [];

  private static MINIMUM_INTERVIEW_DURATION = 60; // 60 seconds minimum
  private static MINIMUM_USER_MESSAGES = 3; // At least 3 user messages

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): InterviewTrackingService {
    if (!InterviewTrackingService.instance) {
      InterviewTrackingService.instance = new InterviewTrackingService();
    }
    return InterviewTrackingService.instance;
  }

  public startSession(topic: InterviewTopic): void {
    this.currentSession = {
      topic,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      messages: []
    };
    console.log(`Started interview session for ${topic.title}`);
  }

  public addMessage(role: 'user' | 'ai', content: string): void {
    if (!this.currentSession) {
      console.warn('No active interview session');
      return;
    }

    this.currentSession.messages.push({
      role,
      content,
      timestamp: Date.now()
    });
  }

  public endSession(): InterviewSession | null {
    if (!this.currentSession) {
      console.warn('No active interview session to end');
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = 
      (this.currentSession.endTime - this.currentSession.startTime) / 1000; // in seconds

    const completedSession = { ...this.currentSession };
    this.sessionHistory.push(completedSession);
    
    console.log(`Ended interview session. Duration: ${completedSession.duration.toFixed(2)}s`);
    this.currentSession = null;
    
    return completedSession;
  }

  public getCurrentSession(): InterviewSession | null {
    return this.currentSession;
  }

  public getLastSession(): InterviewSession | null {
    if (this.sessionHistory.length === 0) {
      return null;
    }
    return this.sessionHistory[this.sessionHistory.length - 1];
  }

  /**
   * Checks if the interview is substantial enough to be evaluated
   */
  private isInterviewSubstantial(session: InterviewSession): boolean {
    // Check if interview lasted at least the minimum duration
    if (session.duration < InterviewTrackingService.MINIMUM_INTERVIEW_DURATION) {
      console.log(`Interview too short: ${session.duration.toFixed(2)}s < ${InterviewTrackingService.MINIMUM_INTERVIEW_DURATION}s`);
      return false;
    }
    
    // Check if user provided enough messages
    const userMessages = session.messages.filter(msg => msg.role === 'user');
    if (userMessages.length < InterviewTrackingService.MINIMUM_USER_MESSAGES) {
      console.log(`Too few user messages: ${userMessages.length} < ${InterviewTrackingService.MINIMUM_USER_MESSAGES}`);
      return false;
    }
    
    // Check if there's actual substantial content (not just very short messages)
    const totalUserContentLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const averageMessageLength = totalUserContentLength / userMessages.length;
    if (averageMessageLength < 10) { // Average message should be at least 10 chars
      console.log(`Messages too short: avg length ${averageMessageLength.toFixed(2)} chars`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Request an evaluation from the Gemini API
   */
  public async requestAIEvaluation(session: InterviewSession): Promise<InterviewFeedback | null> {
    if (!session) return null;
    
    try {
      // Call the gemini-evaluator to get AI-generated feedback
      const feedback = await evaluateInterview(session);
      
      if (feedback) {
        // Store the evaluation on the session
        session.aiEvaluation = {
          evaluated: true,
          timestamp: Date.now(),
          feedback: feedback
        };
        console.log('AI evaluation complete for interview session');
      }
      
      return feedback;
    } catch (error) {
      console.error('Failed to request AI evaluation:', error);
      return null;
    }
  }

  public generateFeedback(): InterviewFeedback | null {
    const session = this.getLastSession();
    if (!session) {
      console.warn('No completed interview session available');
      return null;
    }
    
    // Check if the interview is substantial enough to evaluate
    const isSubstantial = this.isInterviewSubstantial(session);
    
    if (!isSubstantial) {
      // Return a special feedback object for insufficient interviews
      return {
        overallScore: 0, // No score for insufficient interviews
        overallFeedback: "Your interview was too brief to provide meaningful feedback. Please participate in a longer interview to receive a complete evaluation.",
        categoryScores: [],
        strengths: ["Not enough data to determine strengths."],
        weaknesses: ["The interview was too short to identify areas for improvement."],
        nextSteps: [
          "Try again with a complete interview session",
          "Aim to engage for at least 2-3 minutes",
          "Provide detailed responses to interview questions"
        ]
      };
    }

    // If we have stored AI evaluation results, use those
    if (session.aiEvaluation && session.aiEvaluation.feedback) {
      return session.aiEvaluation.feedback;
    }
    
    // Otherwise, fall back to the local calculation
    console.log('No AI evaluation available, using fallback scoring');
    
    // Calculate topic-specific category scores
    const categoryScores = this.calculateCategoryScores(session);
    
    // Calculate overall score only from categories that were covered
    const coveredCategoryScores = categoryScores.filter(item => !item.notCovered);
    const overallScore = coveredCategoryScores.length > 0 
      ? Math.floor(coveredCategoryScores.reduce((sum, item) => sum + item.score, 0) / coveredCategoryScores.length)
      : 75; // Default if no categories were properly covered

    // Determine strengths and weaknesses (only from covered categories)
    const strengths = coveredCategoryScores
      .filter(item => item.score >= 85)
      .map(item => `Strong ${item.category.toLowerCase()} skills demonstrated throughout the interview.`);
    
    const weaknesses = coveredCategoryScores
      .filter(item => item.score < 80)
      .map(item => `Room for improvement in ${item.category.toLowerCase()}.`);
      
    // Add note about uncovered categories if any
    const uncoveredCategories = categoryScores.filter(item => item.notCovered);
    if (uncoveredCategories.length > 0) {
      const uncoveredNames = uncoveredCategories.map(item => item.category.toLowerCase()).join(', ');
      weaknesses.push(`The interview didn't adequately cover: ${uncoveredNames}. Consider discussing these in your next interview.`);
    }

    // Generate feedback
    return {
      overallScore,
      overallFeedback: `Your overall performance was ${this.getScoreDescription(overallScore)} for a ${session.topic.title} role.`,
      categoryScores,
      strengths: strengths.length ? strengths : ["Good overall performance."],
      weaknesses: weaknesses.length ? weaknesses : ["Continue practicing all aspects of the interview."],
      nextSteps: [
        "Review the feedback for each category",
        "Practice in areas that need improvement",
        "Schedule another mock interview in 1-2 weeks",
        "Research common questions for this role type"
      ]
    };
  }

  private calculateCategoryScores(session: InterviewSession): FeedbackScore[] {
    const categories = this.getCategories(session.topic.id);
    
    return categories.map(category => {
      // Check if this category was covered in the interview
      const isCategoryCovered = this.isCategoryCovered(category.toLowerCase(), session);
      
      // Base score calculation on analytics
      const score = this.calculateCategoryScore(category.toLowerCase(), session);
      
      return {
        category,
        score,
        feedback: isCategoryCovered 
          ? `Your ${category.toLowerCase()} skills were ${this.getScoreDescription(score)}.`
          : `This category wasn't fully covered in the interview. The score is an estimate based on limited data.`,
        improvementTips: this.generateImprovementTips(category, score),
        notCovered: !isCategoryCovered
      };
    });
  }

  private calculateCategoryScore(category: string, session: InterviewSession): number {
    const userMessages = session.messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) return 75; // Default score if no messages
    
    // Analyze various factors
    const relevanceScore = this.calculateRelevanceScore(category, session);
    const responseQualityScore = this.calculateResponseQualityScore(userMessages);
    const engagementScore = this.calculateEngagementScore(session);
    const consistencyScore = this.calculateConsistencyScore(userMessages);
    
    // Weight the different scores
    const weightedScore = (
      relevanceScore * 0.4 + 
      responseQualityScore * 0.3 + 
      engagementScore * 0.2 + 
      consistencyScore * 0.1
    );
    
    // Add some variability (±5 points) to make it feel more realistic
    const variability = (Math.random() * 10) - 5;
    
    // Ensure score is between 70-100
    return Math.max(70, Math.min(100, Math.round(weightedScore + variability)));
  }

  private calculateRelevanceScore(category: string, session: InterviewSession): number {
    // Get topic and category keywords
    const topicKeywords = [...(TOPIC_KEYWORDS[session.topic.id] || []), ...DEFAULT_KEYWORDS];
    const categoryKeywords = CATEGORY_KEYWORDS[category.toLowerCase()] || [];
    const combinedKeywords = [...topicKeywords, ...categoryKeywords];
    
    // Count keyword occurrences in user messages
    let keywordCount = 0;
    const userContent = session.messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase())
      .join(' ');

    combinedKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = userContent.match(regex);
      if (matches) keywordCount += matches.length;
    });
    
    // Extract AI questions related to this category
    const aiMessages = session.messages
      .filter(msg => msg.role === 'ai')
      .map(msg => msg.content.toLowerCase());
    
    // Check if category keywords appear in AI questions (to verify category was covered)
    let categoryMentionedInQuestions = false;
    for (const msg of aiMessages) {
      // Check for direct category mentions (e.g., "About your problem solving skills...")
      if (msg.includes(category.toLowerCase())) {
        categoryMentionedInQuestions = true;
        break;
      }
      
      // Check for related keywords
      for (const keyword of categoryKeywords) {
        if (msg.includes(keyword)) {
          categoryMentionedInQuestions = true;
          break;
        }
      }
      
      if (categoryMentionedInQuestions) break;
    }
    
    // Calculate score based on keyword density
    const contentLength = userContent.split(' ').length;
    const keywordDensity = contentLength > 0 ? (keywordCount / contentLength) * 100 : 0;
    
    // Calculate base score between 70-100
    let score = Math.min(100, 70 + (keywordDensity * 2));
    
    // Adjust score if category wasn't covered in questions
    if (!categoryMentionedInQuestions && score > 75) {
      score = 75; // Cap score if we didn't ask about this category
      console.log(`Category ${category} wasn't explicitly covered in questions, capping score`);
    }
    
    return score;
  }

  private calculateResponseQualityScore(userMessages: ConversationMessage[]): number {
    // Average response length
    const avgLength = userMessages.reduce((sum, msg) => 
      sum + msg.content.split(' ').length, 0) / userMessages.length;
    
    // Penalize very short responses, reward substantive ones
    // Ideal range is 15-40 words per response
    const lengthScore = 
      avgLength < 5 ? 70 :
      avgLength < 10 ? 75 :
      avgLength < 15 ? 80 :
      avgLength < 25 ? 90 :
      avgLength < 40 ? 95 :
      avgLength < 60 ? 90 :
      avgLength < 100 ? 85 : 80; // Too long can be unfocused
    
    return lengthScore;
  }

  private calculateEngagementScore(session: InterviewSession): number {
    const messages = session.messages;
    if (messages.length < 4) return 75; // Not enough data
    
    // Look at response times
    const responseTimes: number[] = [];
    let lastAiMessage = -1;
    
    messages.forEach((msg, index) => {
      if (msg.role === 'user' && lastAiMessage !== -1) {
        responseTimes.push(msg.timestamp - messages[lastAiMessage].timestamp);
      }
      if (msg.role === 'ai') lastAiMessage = index;
    });
    
    if (responseTimes.length === 0) return 75;
    
    // Average response time in seconds
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) 
      / responseTimes.length / 1000;
    
    // Score based on response time: 
    // 5-25 seconds is ideal (shows thought but not too long)
    const timeScore = 
      avgResponseTime < 3 ? 75 : // Too quick, not thinking
      avgResponseTime < 5 ? 85 :
      avgResponseTime < 15 ? 95 :
      avgResponseTime < 30 ? 90 :
      avgResponseTime < 60 ? 80 :
      avgResponseTime < 120 ? 75 : 70; // Too slow, disengaged
    
    return timeScore;
  }

  private calculateConsistencyScore(userMessages: ConversationMessage[]): number {
    if (userMessages.length < 3) return 75;
    
    // Calculate standard deviation of message lengths to measure consistency
    const lengths = userMessages.map(msg => msg.content.split(' ').length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    const squaredDiffs = lengths.map(len => Math.pow(len - avgLength, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation means more consistent answers
    const consistencyScore = 100 - Math.min(30, stdDev);
    return consistencyScore;
  }

  private getCategories(topicId: string): string[] {
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

  private getScoreDescription(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very good';
    if (score >= 75) return 'good';
    return 'adequate';
  }

  private generateImprovementTips(category: string, score: number): string[] {
    const categoryLower = category.toLowerCase();
    
    if (score >= 90) {
      return [
        `Continue to develop your ${categoryLower} skills to maintain excellence.`,
        `Share your ${categoryLower} expertise with others to solidify your knowledge.`,
        `Look for opportunities to apply your ${categoryLower} skills in complex scenarios.`
      ];
    }
    
    if (score >= 80) {
      return [
        `Deepen your ${categoryLower} knowledge through more advanced practice.`,
        `Seek feedback on your ${categoryLower} approach from seasoned professionals.`,
        `Work on edge cases to strengthen your ${categoryLower} abilities.`
      ];
    }
    
    return [
      `Practice ${categoryLower} scenarios more regularly.`,
      `Consider studying more about ${categoryLower} fundamentals.`,
      `Get feedback on your ${categoryLower} approach from peers.`
    ];
  }

  /**
   * Check if a specific category was covered in the interview
   */
  private isCategoryCovered(category: string, session: InterviewSession): boolean {
    const categoryKeywords = CATEGORY_KEYWORDS[category.toLowerCase()] || [];
    
    // Check AI messages for category mentions
    const aiMessages = session.messages
      .filter(msg => msg.role === 'ai')
      .map(msg => msg.content.toLowerCase());
      
    // Check if category or its keywords are mentioned in AI messages
    for (const msg of aiMessages) {
      // Direct category mention
      if (msg.includes(category.toLowerCase())) {
        return true;
      }
      
      // Check for related keywords (need at least 2 matches to consider it covered)
      let keywordMatches = 0;
      for (const keyword of categoryKeywords) {
        if (msg.includes(keyword)) {
          keywordMatches++;
          if (keywordMatches >= 2) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

export default InterviewTrackingService; 