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

import { useState, useEffect } from "react";
import "./feedback-scorecard.scss";
import { InterviewTopic } from "../../contexts/LiveAPIContext";
import InterviewTrackingService from "../../services/InterviewTrackingService";
import { evaluateInterview } from "../../lib/gemini-evaluator";

export interface FeedbackScore {
  category: string;
  score: number;
  feedback: string;
  improvementTips: string[];
  notCovered?: boolean;
}

export interface InterviewFeedback {
  overallScore: number;
  overallFeedback: string;
  categoryScores: FeedbackScore[];
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}

interface FeedbackScorecardProps {
  topic: InterviewTopic;
  onRestart: () => void;
}

export default function FeedbackScorecard({ topic, onRestart }: FeedbackScorecardProps) {
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [buttonFeedback, setButtonFeedback] = useState<string | null>(null);
  const [interviewTooShort, setInterviewTooShort] = useState(false);

  // Get feedback from the tracking service or AI evaluation
  useEffect(() => {
    const trackingService = InterviewTrackingService.getInstance();
    const lastSession = trackingService.getLastSession();
    
    async function getFeedback() {
      try {
        // First check if an interview session exists
        if (!lastSession) {
          setError("No interview data available");
          setLoading(false);
          return;
        }
        
        // Step 1: Try to get AI evaluation
        const aiFeedback = await evaluateInterview(lastSession);
        
        if (aiFeedback) {
          if (aiFeedback.overallScore === 0) {
            // Special case: Interview was too short/incomplete
            setInterviewTooShort(true);
          }
          setFeedback(aiFeedback);
          setLoading(false);
          return;
        }
        
        // Step 2: Fallback to tracking service if AI evaluation fails
        console.log("AI evaluation failed, falling back to tracking service");
        const generatedFeedback = trackingService.generateFeedback();
        
        if (generatedFeedback) {
          if (generatedFeedback.overallScore === 0) {
            // Special case: Interview was too short/incomplete
            setInterviewTooShort(true);
          }
          setFeedback(generatedFeedback);
        } else {
          setError("No interview data available for feedback generation");
        }
      } catch (err) {
        setError("Failed to generate interview feedback");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    // Start the feedback process with a small delay for UX
    const timer = setTimeout(() => {
      getFeedback();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [topic]);

  // Add these functions for sharing and downloading
  const handleShareResults = () => {
    if (!feedback) return;
    
    setButtonFeedback('share');
    setTimeout(() => setButtonFeedback(null), 2000);
    
    if (navigator.share) {
      navigator.share({
        title: `${topic.title} Interview Feedback`,
        text: `I scored ${feedback.overallScore}/100 on my ${topic.title} interview practice!`,
        url: window.location.href,
      }).catch(error => {
        console.log('Error sharing:', error);
        // Fallback for when sharing fails
        copyToClipboard();
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    if (!feedback) return;
    
    const text = `${topic.title} Interview Feedback: Overall Score ${feedback.overallScore}/100\n${feedback.overallFeedback}`;
    navigator.clipboard.writeText(text)
      .then(() => {
        setButtonFeedback('copied');
        setTimeout(() => setButtonFeedback(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setButtonFeedback('error');
        setTimeout(() => setButtonFeedback(null), 2000);
      });
  };

  const handleDownloadReport = () => {
    if (!feedback) return;
    
    setButtonFeedback('download');
    setTimeout(() => setButtonFeedback(null), 2000);
    
    // Create a text report
    const reportContent = `
    ${topic.title} INTERVIEW FEEDBACK REPORT
    ===============================
    Overall Score: ${feedback.overallScore}/100
    
    ${feedback.overallFeedback}
    
    STRENGTHS:
    ${feedback.strengths.map(s => `- ${s}`).join('\n')}
    
    AREAS FOR IMPROVEMENT:
    ${feedback.weaknesses.map(w => `- ${w}`).join('\n')}
    
    NEXT STEPS:
    ${feedback.nextSteps.map(n => `- ${n}`).join('\n')}
    
    DETAILED CATEGORY SCORES:
    ${feedback.categoryScores.map(c => 
      `${c.category}: ${c.score}/100 ${c.notCovered ? '(Not fully covered)' : ''}\n${c.feedback}`
    ).join('\n\n')}
    `;
    
    // Create a blob and download it
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.title.toLowerCase().replace(/\s+/g, '-')}-interview-feedback.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="feedback-scorecard loading">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <p>Analyzing your interview performance...</p>
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="feedback-scorecard error">
        <div className="error-message">
          <span className="material-symbols-outlined">error</span>
          <p>{error || "Failed to load feedback"}</p>
          <button onClick={onRestart} className="try-again-button">Try Another Interview</button>
        </div>
      </div>
    );
  }

  // Special UI for too-short interviews
  if (interviewTooShort) {
    return (
      <div className="feedback-scorecard error">
        <div className="error-message">
          <span className="material-symbols-outlined">timer</span>
          <h2>Interview Too Brief</h2>
          <p>Your interview was too short to provide a meaningful evaluation. For an accurate assessment, please:</p>
          <ul className="error-tips">
            <li>Participate for at least 1-2 minutes</li>
            <li>Answer multiple questions in detail</li>
            <li>Engage with the interviewer's questions</li>
          </ul>
          <button onClick={onRestart} className="try-again-button">Try Again</button>
        </div>
      </div>
    );
  }

  // Regular feedback UI for good interviews
  return (
    <div className="feedback-scorecard">
      <div className="scorecard-header">
        <h1>Interview Feedback</h1>
        <div className="interview-type">{topic.title} Interview</div>
        <div className="overall-score">
          <div className="score-circle">
            <div className="score-value">{feedback.overallScore}</div>
            <div className="score-label">Overall Score</div>
          </div>
        </div>
        <p className="overall-feedback">{feedback.overallFeedback}</p>
        <div className="scoring-explanation">
          <p>This feedback is based on your actual interview responses and directly maps to categories that were discussed. 
             Categories with <span className="info-icon"><span className="material-symbols-outlined">info</span></span> were not fully covered during your interview.</p>
        </div>
      </div>

      <div className="scorecard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Detailed Feedback
        </button>
      </div>

      <div className="scorecard-content">
        {activeTab === 'overview' ? (
          <div className="overview-tab">
            <div className="feedback-section">
              <h2>Strengths</h2>
              <ul className="feedback-list strengths">
                {feedback.strengths.map((strength, index) => (
                  <li key={`strength-${index}`}>
                    <span className="material-symbols-outlined">check_circle</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="feedback-section">
              <h2>Areas for Improvement</h2>
              <ul className="feedback-list weaknesses">
                {feedback.weaknesses.map((weakness, index) => (
                  <li key={`weakness-${index}`}>
                    <span className="material-symbols-outlined">info</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>

            <div className="feedback-section">
              <h2>Recommended Next Steps</h2>
              <ul className="feedback-list next-steps">
                {feedback.nextSteps.map((step, index) => (
                  <li key={`step-${index}`}>
                    <span className="material-symbols-outlined">arrow_forward</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="details-tab">
            <div className="category-scores">
              {feedback.categoryScores.map((category, index) => (
                <div key={`category-${index}`} className="category-card">
                  <div className="category-header">
                    <h3>{category.category}</h3>
                    <div className="category-score" style={{ 
                      backgroundColor: 
                        category.score >= 90 ? 'var(--success-color)' : 
                        category.score >= 80 ? 'var(--good-color)' : 
                        category.score >= 70 ? 'var(--average-color)' : 'var(--warning-color)'
                    }}>
                      {category.score}
                      {category.notCovered && <span className="material-symbols-outlined not-covered-icon">info</span>}
                    </div>
                  </div>
                  <p className="category-feedback">{category.feedback}</p>
                  <div className="improvement-tips">
                    <h4>Improvement Tips</h4>
                    <ul>
                      {category.improvementTips.map((tip, tipIndex) => (
                        <li key={`tip-${index}-${tipIndex}`}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="scoring-methodology">
                    <button 
                      className="info-toggle" 
                      onClick={() => {
                        const infoElement = document.getElementById(`methodology-${index}`);
                        if (infoElement) {
                          infoElement.classList.toggle('visible');
                        }
                      }}
                    >
                      <span className="material-symbols-outlined">info</span>
                      How this score was calculated
                    </button>
                    <div id={`methodology-${index}`} className="methodology-info">
                      <p>Your score was calculated based on:</p>
                      <ul>
                        <li><strong>Relevance (40%):</strong> How well your answers included relevant keywords and concepts for this category</li>
                        <li><strong>Response Quality (30%):</strong> The depth and substance of your answers</li>
                        <li><strong>Engagement (20%):</strong> How promptly and consistently you responded to questions</li>
                        <li><strong>Consistency (10%):</strong> How consistent your responses were throughout the interview</li>
                      </ul>
                      <p className="note">Note: Scores are only calculated for categories that were covered during the interview.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="action-buttons">
        <button className="action-button" onClick={onRestart}>
          <span className="material-symbols-outlined">refresh</span>
          Try Another Interview
        </button>
        <button className="action-button" onClick={handleShareResults}>
          <span className="material-symbols-outlined">
            {buttonFeedback === 'share' || buttonFeedback === 'copied' ? 'check_circle' : 'share'}
          </span>
          {buttonFeedback === 'share' ? 'Sharing...' : 
           buttonFeedback === 'copied' ? 'Copied!' : 'Share Results'}
        </button>
        <button className="action-button" onClick={handleDownloadReport}>
          <span className="material-symbols-outlined">
            {buttonFeedback === 'download' ? 'check_circle' : 'download'}
          </span>
          {buttonFeedback === 'download' ? 'Downloaded!' : 'Download Report'}
        </button>
      </div>
    </div>
  );
} 