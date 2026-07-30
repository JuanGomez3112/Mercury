let tabInputs = document.querySelectorAll('.tabInput');

tabInputs.forEach((input) => {

    input.addEventListener( 'change', (e)=>{
        let id = input.ariaValueMax;
        let thisSwiper = document.getElementById('.swipper' + id);
        thisSwiper.swiper.update();
    })

})