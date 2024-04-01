document.addEventListener('DOMContentLoaded', function() {
    const menuIcon = document.querySelector('.menu-icon');
    const menu = document.querySelector('.menu');
    const toggleTheme = document.querySelector('#toggle-theme');
    const newFile = document.querySelector('#new-file');
    const saveFile = document.querySelector('#save-file');
    const loadFile = document.querySelector('#load-file');
	const saveAsFile = document.querySelector('#save-as');
    let currentFilename = null;

    menuIcon.addEventListener('click', function() {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
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

    toggleTheme.addEventListener('click', function() {
		document.body.classList.toggle('dark-theme');
		// Remove the !important flag from the CSS
		document.querySelectorAll('.focus-mode .ql-editor .active-text').forEach(element => {
			element.style.color = '';
		});
		removeAlllights();
		
	});

   newFile.addEventListener('click', function() {
		const confirmation = confirm('Are you sure you want to create a new file? Any unsaved changes will be lost.');
		if (confirmation) {
			editor.setContents([{ insert: '\n' }]);
			currentFilename = null;
		}
	});

    saveFile.addEventListener('click', async function() {
        const content = JSON.stringify(editor.getContents());

        if (!currentFilename) {
            currentFilename = prompt('Please enter a filename:');
            if (!currentFilename) {
                alert('File not saved. Please provide a filename.');
                return;
            }
        }

        try {
            const response = await fetch('/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content, filename: currentFilename })
            });

            if (response.ok) {
                alert('File saved successfully!');
            } else {
                const data = await response.json();
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while saving the file.');
        }
    });

    loadFile.addEventListener('click', async function() {
        try {
            const response = await fetch('/files');
            if (response.ok) {
                const data = await response.json();
                const files = data.files;

                const fileList = document.createElement('ul');
                fileList.classList.add('file-list');
                files.forEach(file => {
                    const listItem = document.createElement('li');
                    listItem.textContent = file;
                    listItem.addEventListener('click', async function() {
                        try {
                            const response = await fetch('/load', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ filename: file })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                editor.setContents(JSON.parse(data.content));
                                currentFilename = file;
                                alert('File loaded successfully!');
                                fileList.remove();
                            } else {
                                const data = await response.json();
                                alert(`Error: ${data.message}`);
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            alert('An error occurred while loading the file.');
                        }
                    });
                    fileList.appendChild(listItem);
                });

                const fileListContainer = document.createElement('div');
                fileListContainer.classList.add('file-list-container');
                fileListContainer.appendChild(fileList);
                document.body.appendChild(fileListContainer);

                fileListContainer.addEventListener('click', function(event) {
                    if (event.target === fileListContainer) {
                        fileListContainer.remove();
                    }
                });
            } else {
                alert('Error retrieving file list.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while retrieving the file list.');
        }
    });
	
	saveAsFile.addEventListener('click', async function() {
	  const content = JSON.stringify(editor.getContents());
	  const fileFormat = prompt('Enter the file format (html, txt, csv, docx, md, pdf):');
	  if (!fileFormat) {
		alert('No file format selected.');
		return;
	  }

	  const filename = prompt('Enter the filename:');
	  if (!filename) {
		alert('No filename provided.');
		return;
	  }

	  try {
		const fileContent = await convertToFormat(content, fileFormat);
		if (fileContent) {
		  const response = await fetch('/save-as', {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json'
			},
			body: JSON.stringify({ content: fileContent, filename, fileFormat })
		  });

		  if (response.ok) {
			alert('File saved successfully!');
		  } else {
			const data = await response.json();
			alert(`Error: ${data.message}`);
		  }
		}
	  } catch (error) {
		console.error('Error converting file format:', error);
		alert('An error occurred while converting the file format.');
	  }
	});
	
	function convertToMarkdown(contentObject) {
	  // Create a new instance of Turndown
	  const turndownService = new TurndownService();

	  // Convert HTML to Markdown using Turndown
	  const markdowned = turndownService.turndown(contentObject);

	  return markdowned;
	}
	
	function convertToDocx(htmlContent) {
		const contentDocument = new DOMParser().parseFromString(htmlContent, 'text/html');
		const body = contentDocument.body;

		// Remove styles and scripts
		const styles = contentDocument.querySelectorAll('style');
		styles.forEach(style => style.parentNode.removeChild(style));

		const scripts = contentDocument.querySelectorAll('script');
		scripts.forEach(script => script.parentNode.removeChild(script));

		// Convert images to base64
		const regularImages = contentDocument.querySelectorAll('img');
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		[...regularImages].forEach(imgElement => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			canvas.width = imgElement.width;
			canvas.height = imgElement.height;
			ctx.drawImage(imgElement, 0, 0);
			const dataURL = canvas.toDataURL();
			imgElement.setAttribute('src', dataURL);
		});

		canvas.remove();

		// Wrap the content in a Word-compatible structure
		const wordContent = `
			<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
				<body>
					${body.innerHTML}
				</body>
			</html>
		`;

		const converted = htmlDocx.asBlob(wordContent, {orientation: 'portrait', margins: {top: 720}});
		return converted;
	}
	
	function convertToPdf(contentObject, filename) {
	  return new Promise((resolve, reject) => {
		const docDefinition = {
		  content: contentObject.ops.map(op => {
			if (op.insert && typeof op.insert === 'string') {
			  return { text: op.insert };
			} else if (op.insert && op.insert.image) {
			  return { image: op.insert.image };
			}
			return '';
		  })
		};

		pdfMake.createPdf(docDefinition).getBlob(blob => {
		  resolve(blob);
		});
	  });
	}

	async function convertToFormat(content, fileFormat) {
	  const contentObject = JSON.parse(content);
	  let fileContent = '';

	  switch (fileFormat) {
		case 'html':
		  fileContent = editor.root.innerHTML;
		  break;
		case 'txt':
		  fileContent = editor.getText();
		  break;
		case 'csv':
		  const lines = editor.getText().split('\n');
		  fileContent = lines.map(line => line.split('\t').join(',')).join('\n');
		  break;
		case 'docx':
		  fileContent = convertToDocx(editor.root.innerHTML);
		  break;
		case 'md':
		  try {
			fileContent = convertToMarkdown(editor.root.innerHTML);
		  } catch (error) {
			console.error('Error converting to Markdown:', error);
			alert('An error occurred while converting to Markdown.');
			return null;
		  }
		  break;
		case 'pdf':
		  try {
			fileContent = await convertToPdf(contentObject);
		  } catch (error) {
			console.error('Error converting to PDF:', error);
			alert('An error occurred while converting to PDF.');
			return null;
		  }
		  break;
		default:
		  alert('Invalid file format selected.');
		  return null;
	  }

	  return fileContent;
	}
	
});