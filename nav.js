function OkayNav(target, rawopts) {
	var self = this;
	var opts = Object(rawopts);
	self.target = findOrElement(target);
	self.target.setAttribute('data-okay-target', '');
	self.measure = findOrElement(opts.measure) || target.parentNode;
	self.items = typeof opts.items === 'string' ? document.querySelectorAll(opts.items) : opts.items;
	self.items = self.items || target.querySelectorAll('li');
	self.items = Array.prototype.slice.call(self.items);
	self.items.forEach(function (item) {
		item.setAttribute('data-okay-item', '');
	});
	self.toggle = findOrElement(opts.toggle) || document.createElement('button');
	self.toggle.setAttribute('aria-expanded', 'false');
	self.toggle.setAttribute('aria-hidden', '');
	self.toggle.setAttribute('data-okay-toggle', '');
	self.toggle.addEventListener('click', function () {
		self.toggleOverflow();
	});
	if (!self.toggle.parentNode) {
		self.toggle.innerHTML = '<svg viewBox="0 0 100 100"><title>Navigation</title><g><circle cx="51" cy="17.75" r="10.75"></circle><circle cx="51" cy="50" r="10.75"></circle><circle cx="51" cy="82.25" r="10.75"></circle></g></svg>';
		self.target.appendChild(self.toggle);
	}
	self.overflow = findOrElement(opts.overflow) || document.createElement('ul');
	self.overflow.setAttribute('aria-hidden', '');
	self.overflow.setAttribute('data-okay-overflow', '');
	if (!self.overflow.parentNode) {
		self.target.appendChild(self.overflow);
	}
	self.overflowItems = [];
	self.padding = opts.padding || 0;
	window.addEventListener('resize', function () {
		self.recalculate();
	});
	self.target.addEventListener('blur', function (event) {
		setTimeout(function () {
			if (!self.target.contains(document.activeElement)) {
				self.hideOverflow();
			}
		}, 16);
	}, true);
	self.recalculate();
};
OkayNav.prototype.recalculate = function recalculate() {
	var self = this;
	if (!self._currentAnimationFrame) {
		self._currentAnimationFrame = requestAnimationFrame(function () {
			delete self._currentAnimationFrame;
		});
		var width = getMeasureWidth(self);
		if (width < self.padding) {
			var hasToggle = self.toggle.hasAttribute('aria-hidden');
			while (self.items.length && width < self.padding) {
				var lastChild = self.items.pop();
				if (hasToggle) {
					self.toggle.removeAttribute('aria-hidden');
					fire(self, self.target, 'showtoggle');
					hasToggle = false;
				}
				self.overflowItems.unshift({
					node:   lastChild,
					parent: lastChild.parentNode,
					width:  getOuterWidth(lastChild)
				});
				self.overflow.appendChild(lastChild);
				fire(self, lastChild, 'hideitem');
				width += self.overflowItems[0].width;
				if (width > 0) {
					width = getMeasureWidth(self);
				}
			}
		} else {
			if (self.overflowItems.length) {
				while (self.overflowItems.length && (width > self.overflowItems[0].width + self.padding)) {
					var lastItem = self.overflowItems.shift();
					lastItem.parent.appendChild(lastItem.node);
					self.items.push(lastItem.node);
					width -= lastItem.width;
					fire(self, lastItem.node, 'showitem');
				}
				if (!self.overflowItems.length) {
					self.toggle.setAttribute('aria-expanded', 'false');
					self.toggle.setAttribute('aria-hidden', '');
					fire(self, self.target, 'hidetoggle');
					if (!self.overflow.hasAttribute('aria-hidden')) {
						self.overflow.setAttribute('aria-hidden', '');
						fire(self, self.target, 'hideoverflow');
					}
				}
			}
		}
	}
};
OkayNav.prototype.showOverflow = function showOverflow() {
	var self = this;
	if (self.toggle.getAttribute('aria-expanded') === 'false') {
		self.toggle.setAttribute('aria-expanded', 'true');
		self.overflow.removeAttribute('aria-hidden', '');
		fire(self, self.target, 'showoverflow');
	}
};
OkayNav.prototype.hideOverflow = function hideOverflow() {
	var self = this;
	if (self.toggle.getAttribute('aria-expanded') === 'true') {
		self.toggle.setAttribute('aria-expanded', 'false');
		self.overflow.setAttribute('aria-hidden', '');
		fire(self, self.target, 'hideoverflow');
	}
};
OkayNav.prototype.toggleOverflow = function hideOverflow() {
	if (this.overflow.hasAttribute('aria-hidden')) {
		this.showOverflow();
	} else {
		this.hideOverflow();
	}
};
function findOrElement(option) {
	return typeof option === 'string' ? document.querySelector(option) : option;
}
function getMeasureWidth(self) {
	return getInnerWidth(self.measure) - Array.prototype.reduce.call(self.measure.children, function (initialValue, child) {
		return initialValue + getOuterWidth(child);
	}, 0);
}
function fire(self, element, type) {
	var event = document.createEvent('Event');
	event.initEvent('okaynav:' + type, true, false);
	event.detail = self;
	element.dispatchEvent(event);
}
function getInnerWidth(element) {
	var computedStyle = getComputedStyle(element);
	return element.getBoundingClientRect().width - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight);
}
function getOuterWidth(element) {
	var computedStyle = getComputedStyle(element);
	return element.getBoundingClientRect().width + parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
}
