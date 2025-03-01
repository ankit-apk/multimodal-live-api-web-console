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

  // Get feedback from the tracking service
  useEffect(() => {
    const trackingService = InterviewTrackingService.getInstance();
    
    // Simulate API processing time
    const timer = setTimeout(() => {
      try {
        const generatedFeedback = trackingService.generateFeedback();
        
        if (generatedFeedback) {
          setFeedback(generatedFeedback);
        } else {
          // If no session data is available, show an error
          setError("No interview data available for feedback generation");
        }
      } catch (err) {
        setError("Failed to generate interview feedback");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [topic]);

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
        <button className="action-button">
          <span className="material-symbols-outlined">share</span>
          Share Results
        </button>
        <button className="action-button">
          <span className="material-symbols-outlined">download</span>
          Download Report
        </button>
      </div>
    </div>
  );
} 