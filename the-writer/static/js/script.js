let editor;

let cursorLine = 0;
let cursorCharOffset = 0;

// add an array of values
const fontFamilyArr = ['Arial', 'Courier', 'Garamond', 'Times New Roman', 'Verdana', 'Calibri', 'Sans-Serif', 'Lato'];
let fonts = Quill.import("attributors/style/font");
fonts.whitelist = fontFamilyArr;
Quill.register(fonts, true);

const fontSizeArr = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px'];
var Size = Quill.import('attributors/style/size');
Size.whitelist = fontSizeArr;
Quill.register(Size, true);

document.addEventListener('DOMContentLoaded', function() {
	
	editor = new Quill('#editor', {
	  modules: {
		imageResize: {
          displaySize: true
        },
		toolbar: [
			['bold', 'italic', 'underline', 'strike'],    // Toggled buttons
			['blockquote', 'code-block', 'formula'],
			[{ 'script': 'sub'}, { 'script': 'super' }], // Superscript/subscript
			['link', 'image', 'video'],

			[{ header: [1, 2, 3, false] }], // Custom heading levels (1-6)
			[{ 'list': 'ordered'}, { 'list': 'bullet' }],
			[{ 'align': [] }],                              // Text alignment (left, center, right, justify)
			[{ 'indent': '-1'}, { 'indent': '+1' }],       // Outdent/indent
			['clean'],                                        // Remove formatting

			[{ 'font': fontFamilyArr }],                               // Font family options
			[{ 'size': fontSizeArr }], // Font size options

		  ],
	  },
	  theme: 'snow' // Set the theme to 'snow'
	});

	editor.root.setAttribute('spellcheck', false);
	
	const editorContainer = document.querySelector('.editor-container');
	const focusModeToggle = document.querySelector('.focus-toggle svg');
	const focusToggleSVG = document.querySelector('.focus-toggle svg');
	
	// Function to set the focus mode color
	function setFocusColor(color) {
	  if (focusToggleSVG) {
		focusToggleSVG.style.setProperty('--focus-icon-color', color);
	  } else {
		console.warn('Focus toggle SVG element not found.');
	  }
	}
	  
	function updateTypewriterScrolling() {
		  const sel = editor.root.ownerDocument.getSelection();
		  const visibleAreaHeight = editorContainer.clientHeight;
		  const scrollPercentage = 0.4;
		  const textAreaElement = editor.root;

		  if (sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			const rects = range.getClientRects();

			if (rects.length > 0) {
				  const cursorTop = rects[0].top;
		  const desiredScrollTop = cursorTop - scrollPercentage * visibleAreaHeight;

		  // Center the text area vertically if the content doesn't fill the entire editor container
		  const contentHeight = textAreaElement.scrollHeight;
		  const editorHeight = editorContainer.clientHeight;

		  if (contentHeight < editorHeight) {
			const paddingTop = textAreaElement.offsetTop;
			const paddingBottom = editorContainer.offsetHeight - textAreaElement.offsetHeight - paddingTop;
			const centerOffset = (editorHeight - contentHeight) / 2;
			textAreaElement.style.paddingTop = `${paddingTop + centerOffset}px`;
			textAreaElement.style.paddingBottom = `${paddingBottom + centerOffset}px`;
		  } else {
			textAreaElement.style.paddingTop = '';
			textAreaElement.style.paddingBottom = '';
		  }

			  // Update scroll position considering current scrollTop and desired scroll direction
			  window.requestAnimationFrame(() => {
				  if(cursorTop != 171){
					  if(cursorTop > 50){
				setTimeout(() => {
				  editor.root.scrollTop += desiredScrollTop;
				  }, 0);
				  }}
			  });

			}
		  }
		}
			
	const debouncedUpdateTypewriterScrolling = debounce(updateTypewriterScrolling, 50);

	editor.on('selection-change', function(selection) {
		debouncedUpdateTypewriterScrolling();
		});

	editor.on('text-change', function(delta, source) {
		debouncedUpdateTypewriterScrolling();
		});
		
  	function removeAlllights() {
		// Get the current theme
		const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

		// Set the color of the highlighted text according to the theme
		const color = theme === 'dark' ? '#ffffff' : '#000000';

		// Remove any existing dim
		editor.formatText(0, editor.getLength(), {
			'color': color
		});
	}
	
	function removeHighlights() {
		// Get the current theme
		const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

		// Set the color of the dimmed text according to the theme
		const color = theme === 'dark' ? '#444' : '#ccc';

		// Remove any existing highlights
		editor.formatText(0, editor.getLength(), {
			'color': color
		});
	}
	
	focusModeToggle.addEventListener('click', function() {
		var defaultFocusColor = document.body.classList.contains('dark-theme') ? '#333' : '#555' ;
		var focusedColor = document.body.classList.contains('dark-theme') ? '#444' : '#D3D3D3';
		  editorContainer.classList.toggle('focus-mode');
		  if (editorContainer.classList.contains('focus-mode')) {
			setFocusColor(focusedColor);
			enableFocusMode();
		  } else {
			setFocusColor(defaultFocusColor);
			removeHighlights;
			removeAlllights();
		  }
		});
	
	function getActiveSentence(editor, range) {
		  if (!range) {
			return { sentence: '', startIndex: -1, endIndex: -1 }; // Handle undefined range
		  }

		  const text = editor.getText(); // Extract text from editor
		  const sentenceRegex = /[^.!?\n]+[.!?\n]?/g; // Modified regex to include line breaks
		  let startIndex = -1;
		  let endIndex = -1;
		  let match;

		  // Check if the cursor is on an empty line
		  const selection = editor.getSelection();
		  if (selection) {
			const [line, offset] = editor.getLine(selection.index);
			const lineText = line.domNode.textContent;
			const isEmptyLine = lineText.trim().length === 0;

			if (isEmptyLine) {
			  return { sentence: '', startIndex: -1, endIndex: -1 }; // Clear activeSentence on empty line
			}
		  }

		  while ((match = sentenceRegex.exec(text)) !== null) {
			if (match.index <= range.index && range.index < match.index + match[0].length) {
			  let activeSentence = match[0];
			  startIndex = match.index;
			  endIndex = match.index + match[0].length;

			  // Check if the active sentence ends with a line break
			  if (activeSentence.endsWith('\n')) {
				// Remove the line break from the active sentence
				activeSentence = activeSentence.slice(0, -1);
				endIndex--;
			  }

			  return { sentence: activeSentence, startIndex, endIndex };
			}
		  }

		  // If no match found, consider the text after the cursor as a potential sentence
		  if (startIndex === -1 && endIndex === -1) {
			let activeSentence = text.slice(range.index);
			startIndex = range.index;
			endIndex = text.length;

			// Check if the active sentence contains a line break
			const lineBreakIndex = activeSentence.indexOf('\n');
			if (lineBreakIndex !== -1) {
			  // Trim the active sentence up to the line break
			  activeSentence = activeSentence.slice(0, lineBreakIndex);
			  endIndex = startIndex + lineBreakIndex;
			}

			return { sentence: activeSentence, startIndex, endIndex };
		  }
		}
		
	function enableFocusMode() {
		removeHighlights();

		const debouncedHighlightActiveText = debounce(highlightActiveText, 200);

		editor.on('selection-change', function(selection) {
		  if (editorContainer.classList.contains('focus-mode')) {if (selection) {
			const activeSentenceInfo = getActiveSentence(editor, selection);
			debouncedHighlightActiveText(activeSentenceInfo, selection);
		  }
		  }
		});


		editor.on('text-change', function(delta, source) {
		  const range = editor.getSelection();
		  if (editorContainer.classList.contains('focus-mode')) {if (range) {
			const activeSentenceInfo = getActiveSentence(editor, range);
			debouncedHighlightActiveText(activeSentenceInfo, range);
		  }}
		});
	  }

	function highlightActiveText(activeSentenceInfo, range) {
		// Get the current theme
		const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

		// Set the color of the active text according to the theme
		const color = theme === 'dark' ? '#ffffff' : '#000000';

		// Remove any existing highlights
		removeHighlights();

		// Apply the 'color' formatting to the active sentence
		if (activeSentenceInfo.sentence) {
			editor.formatText(activeSentenceInfo.startIndex, activeSentenceInfo.sentence.length, {
				'color': color
			});
		}
	}
});