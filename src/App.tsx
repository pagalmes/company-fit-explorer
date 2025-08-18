import React from 'react';
import CMFGraphExplorer from './components/CMFGraphExplorerNew';
import { autoMigrate } from './utils/migrateLegacyState';

const App: React.FC = () => {
  // Check for legacy data and provide migration guidance
  React.useEffect(() => {
    autoMigrate();
  }, []);

  return (
    <div className="App">
      <CMFGraphExplorer />
    </div>
  );
};

export default App;