import React, { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatInterface } from './components/ChatInterface';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);

  const handleStart = (name: string) => {
    setUserName(name);
  };

  if (!userName) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return <ChatInterface userName={userName} />;
};

export default App;