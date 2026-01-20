'use client';

import React from 'react';
import AppContainer from './components/AppContainer';
import { autoMigrate } from './utils/migrateLegacyState';

const App: React.FC = () => {
  // Check for legacy data and provide migration guidance
  React.useEffect(() => {
    autoMigrate();
  }, []);

  return (
    <div className="App" data-graph-explorer>
      <AppContainer />
    </div>
  );
};

export default App;