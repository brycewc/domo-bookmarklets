javascript: (() => {
	navigator.clipboard.writeText('99CCEE');
	let element = document.createElement('div');
	element.setAttribute(
		'style',
		'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:1000;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
	);
	element.innerHTML = `Color Hex 99CCEE copied to clipboard.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

	document.body.appendChild(element);

	let countdown = document.getElementById('countdown');
	let width = 100;
	let interval = setInterval(function () {
		width--;
		countdown.style.width = width + '%';
		if (width <= 0) {
			clearInterval(interval);
			element.parentNode.removeChild(element);
		}
	}, 30); // Adjust the interval time to match the total duration
})();
