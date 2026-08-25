import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PostWinResult } from './GameBoard';

describe('completed game actions', () => {
    it('offers statistics, another deal, and quitting after a win', () => {
        const markup = renderToStaticMarkup(
            <PostWinResult
                moves={86}
                completedTime="1:30"
                onShowStatistics={() => undefined}
                onDealAgain={() => undefined}
                onQuit={() => undefined}
            />
        );

        expect(markup).toContain('You win');
        expect(markup).toContain('Completed in 86 moves and 1:30');
        expect(markup).toContain('Statistics');
        expect(markup).toContain('Deal Again');
        expect(markup).toContain('Quit Game');
    });
});
