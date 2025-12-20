import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import styles from './App.module.css';

type Theme = 'green' | 'dark' | 'blue';

function App() {
  const [theme, setTheme] = useState<Theme>('green');

  const getThemeClass = () => {
    switch (theme) {
      case 'green': return styles.themeGreen;
      case 'dark': return styles.themeDark;
      case 'blue': return styles.themeBlue;
      default: return styles.themeGreen;
    }
  };

  return (
    <div className={`${styles.app} ${getThemeClass()}`}>
      <GameBoard />

      <div className={styles.themeSelector}>
        <button
          className={styles.themeBtn}
          style={{ backgroundColor: '#00796b' }}
          onClick={() => setTheme('green')}
          title="Classic Green"
          aria-label="Classic Green"
        />
        <button
          className={styles.themeBtn}
          style={{ backgroundColor: '#121212' }}
          onClick={() => setTheme('dark')}
          title="Modern Dark"
          aria-label="Modern Dark"
        />
        <button
          className={styles.themeBtn}
          style={{ backgroundColor: '#0277bd' }}
          onClick={() => setTheme('blue')}
          title="Ocean Blue"
          aria-label="Ocean Blue"
        />
      </div>
    </div>
  );
}

export default App;
