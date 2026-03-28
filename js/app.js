async function getMarkdownFiles() {
  const response = await fetch('js/filelist.json');
  const files = await response.json();
  return files;
}

function renderPostList(files) {
  const container = document.getElementById('post-list');
  const totalPosts = document.getElementById('total-posts');

  if (totalPosts) {
    totalPosts.textContent = `共 ${files.length} 篇文章`;
  }

  const tree = buildTree(files);
  container.innerHTML = renderTree(tree, 0);
}

function buildTree(files) {
  const root = { children: {}, files: [] };

  files.forEach(file => {
    const parts = file.path.split('/');
    parts.pop();
    let node = root;

    parts.forEach((part, index) => {
      if (!node.children[part]) {
        node.children[part] = { children: {}, files: [], level: index + 1 };
      }
      node = node.children[part];
    });

    node.files.push(file);
  });

  return root;
}

function renderTree(node, level, parentId) {
  let html = '';
  const parentIdentifier = parentId || 'root';
  const isRootLevel = level === 0;

  Object.keys(node.children).sort().forEach((name, index) => {
    const categoryId = `cat-${parentIdentifier}-${index}`;

    if (isRootLevel) {
      // 根目录：只显示标题，无箭头，不可点击
      html += `
        <div class="post-category-root" style="padding-left: ${level * 20}px">${name}</div>
        <div class="category-content" style="display: block;">
          ${renderTree(node.children[name], level + 1, categoryId)}
        </div>
      `;
    } else {
      // 子目录：可折叠
      html += `
        <div class="post-category collapsed" data-category="${categoryId}" style="padding-left: ${level * 20}px">
          <span class="category-arrow">▶</span>${name}
        </div>
        <div id="${categoryId}" class="category-content" style="display: none;">
          ${renderTree(node.children[name], level + 1, categoryId)}
        </div>
      `;
    }
  });

  node.files.forEach(file => {
    html += renderPostCard(file, level + 1);
  });

  return html;
}

function renderPostCard(file, level) {
  const indent = level > 0 ? ` style="padding-left: ${level * 20}px"` : '';
  return `
    <div class="post-card"${indent}>
      <h3 class="post-title">
        <a href="post.html?file=${encodeURIComponent(file.path)}">${file.title}</a>
      </h3>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const category = e.target.closest('.post-category');
  if (category) {
    const categoryId = category.getAttribute('data-category');
    const content = document.getElementById(categoryId);
    if (content) {
      const isCollapsed = category.classList.contains('collapsed');
      category.classList.toggle('collapsed');
      const arrow = category.querySelector('.category-arrow');
      if (arrow) {
        arrow.textContent = isCollapsed ? '▼' : '▶';
      }
      content.style.display = isCollapsed ? 'block' : 'none';
    }
  }
});

async function renderPost() {
  const params = new URLSearchParams(window.location.search);
  const filePath = params.get('file');

  if (!filePath) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const markdown = await response.text();
    const html = marked.parse(markdown);

    document.getElementById('post-content').innerHTML = html;
    const title = filePath.replace(/\.md$/, '').split('/').pop();
    document.title = `${title} - ${config.siteName}`;

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
      headerTitle.textContent = title;
    }

    const breadcrumbs = generateBreadcrumbs(filePath);
    document.getElementById('breadcrumbs').innerHTML = breadcrumbs;

    // 代码高亮
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }

  } catch (error) {
    document.getElementById('post-content').innerHTML = `
      <div class="error">
        <h2>文章加载失败</h2>
        <p>无法加载文件: ${filePath}</p>
        <p>错误信息: ${error.message}</p>
        <a href="index.html">返回首页</a>
      </div>
    `;
  }
}

function generateBreadcrumbs(filePath) {
  const parts = filePath.split('/');
  const breadcrumbs = parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const name = part.replace(/\.md$/, '');
    return isLast ? `<span class="breadcrumb-current">${name}</span>` : `<span class="breadcrumb-item">${name}</span>`;
  });

  return `
    <nav class="breadcrumbs">
      <a href="index.html">首页</a>
      ${breadcrumbs.map(b => ` / ${b}`).join('')}
    </nav>
  `;
}

function init() {
  const pathname = window.location.pathname;
  if (pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/')) {
    getMarkdownFiles().then(renderPostList);
  } else if (pathname.endsWith('post.html')) {
    renderPost();
  }
}

init();