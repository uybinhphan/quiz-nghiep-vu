// Swipe navigation logic 
import { questionContainer, prevBtn, nextBtn } from './dom-elements.js'; // Also need prevBtn, nextBtn for disabled check
import { navigatePrevious, navigateNext } from './quiz-core.js';

export function initSwipeNavigation() {
    if (!questionContainer) {
        console.warn("[Swipe] Question container not found for swipe initialization.");
        return;
    }

    const leftIndicator = document.createElement('div');
    leftIndicator.className = 'swipe-indicator swipe-left';
    leftIndicator.innerHTML = '‹';

    const rightIndicator = document.createElement('div');
    rightIndicator.className = 'swipe-indicator swipe-right';
    rightIndicator.innerHTML = '›';

    // Check if indicators already exist to prevent duplication during potential HMR or re-init
    if (!questionContainer.querySelector('.swipe-left')) {
        questionContainer.appendChild(leftIndicator);
    }
    if (!questionContainer.querySelector('.swipe-right')) {
        questionContainer.appendChild(rightIndicator);
    }

    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 75;

    questionContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    questionContainer.addEventListener('touchmove', (e) => {
        const currentX = e.changedTouches[0].screenX;
        const diffX = currentX - touchStartX;
        
        const currentLeftIndicator = questionContainer.querySelector('.swipe-left');
        const currentRightIndicator = questionContainer.querySelector('.swipe-right');

        if(currentLeftIndicator) currentLeftIndicator.classList.remove('swipe-active');
        if(currentRightIndicator) currentRightIndicator.classList.remove('swipe-active');

        if (diffX > 30 && currentLeftIndicator) { // Swipe right (for previous)
            if (prevBtn && !prevBtn.disabled) currentLeftIndicator.classList.add('swipe-active');
        } else if (diffX < -30 && currentRightIndicator) { // Swipe left (for next)
            if (nextBtn && !nextBtn.disabled) currentRightIndicator.classList.add('swipe-active');
        }
    }, { passive: true });

    questionContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        setTimeout(() => {
            const currentLeftIndicator = questionContainer.querySelector('.swipe-left');
            const currentRightIndicator = questionContainer.querySelector('.swipe-right');
            if(currentLeftIndicator) currentLeftIndicator.classList.remove('swipe-active');
            if(currentRightIndicator) currentRightIndicator.classList.remove('swipe-active');
        }, 300);
    }, { passive: true });

    function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) < minSwipeDistance) return;

        if (diffX > 0) { // Swipe right
            if (prevBtn && !prevBtn.disabled) {
                navigatePrevious();
            }
        } else { // Swipe left
            if (nextBtn && !nextBtn.disabled) {
                navigateNext();
            }
        }
    }
    console.log("[Swipe] Swipe navigation initialized.");
} 