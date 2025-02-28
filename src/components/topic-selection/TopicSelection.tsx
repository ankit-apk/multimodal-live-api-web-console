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

import { useState } from "react";
import "./topic-selection.scss";

// Define interview topic types
interface InterviewTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// Sample interview topics
const interviewTopics: InterviewTopic[] = [
  {
    id: "software-engineering",
    title: "Software Engineering",
    description: "Practice technical interviews for software engineering positions",
    icon: "code"
  },
  {
    id: "product-management",
    title: "Product Management",
    description: "Prepare for product management interviews with scenario-based questions",
    icon: "integration_instructions"
  },
  {
    id: "data-science",
    title: "Data Science",
    description: "Practice data science interviews with statistical and analytical questions",
    icon: "database"
  },
  {
    id: "ux-design",
    title: "UX Design",
    description: "Prepare for UX interviews with portfolio discussions and design challenges",
    icon: "palette"
  },
  {
    id: "leadership",
    title: "Leadership",
    description: "Practice behavioral and leadership scenario interviews",
    icon: "groups"
  },
  {
    id: "custom",
    title: "Custom Interview",
    description: "Create a custom interview for your specific needs",
    icon: "settings"
  },
];

interface TopicSelectionProps {
  onTopicSelect: (topic: InterviewTopic) => void;
}

export default function TopicSelection({ onTopicSelect }: TopicSelectionProps) {
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopic | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const handleTopicSelect = (topic: InterviewTopic) => {
    setSelectedTopic(topic);
    if (topic.id === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  };

  const handleStartInterview = () => {
    if (selectedTopic) {
      if (selectedTopic.id === "custom" && customTopic.trim()) {
        onTopicSelect({
          ...selectedTopic,
          title: customTopic,
          description: `Custom interview: ${customTopic}`
        });
      } else if (selectedTopic.id !== "custom") {
        onTopicSelect(selectedTopic);
      }
    }
  };

  return (
    <div className="topic-selection">
      <div className="topic-selection-content">
        <h1>What would you like to be interviewed for?</h1>
        <p className="subtitle">Select a topic to begin your practice interview</p>

        <div className="topics-grid">
          {interviewTopics.map((topic) => (
            <div 
              key={topic.id}
              className={`topic-card ${selectedTopic?.id === topic.id ? 'selected' : ''}`}
              onClick={() => handleTopicSelect(topic)}
            >
              <div className="topic-icon">
                <span className="material-symbols-outlined">{topic.icon}</span>
              </div>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </div>
          ))}
        </div>

        {isCustom && (
          <div className="custom-topic">
            <input
              type="text"
              placeholder="Enter your custom interview topic..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          </div>
        )}

        <div className="action-buttons">
          <button 
            className="start-button" 
            disabled={!selectedTopic || (isCustom && !customTopic.trim())} 
            onClick={handleStartInterview}
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
} 