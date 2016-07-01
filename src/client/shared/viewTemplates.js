// Definition of the templates used in the view of `Activity` instances. The key
// of the returned object match the id of the activities.
// These template should be seen as a starting point and modified according
// to the need of the application. Also, the `exprience` template could be
// defined here.
//
// The templates are internally parsed using the `lodash.template` system
// (see [https://lodash.com/docs#template]{@link https://lodash.com/docs#template}
// for more information).
// Variables used inside a given template are declared inside the
// `~/src/client/shared/viewContent.js` file.
export default {
  // template of the `auth` service
  'service:auth': `
    <% if (!rejected) { %>
      <div class="section-top flex-middle">
        <p><%= instructions %></p>
      </div>
      <div class="section-center flex-center">
        <div>
          <input type="password" id="password" />
          <button class="btn" id="send"><%= send %></button>
        </div>
      </div>
      <div class="section-bottom"></div>
    <% } else { %>
      <div class="section-top"></div>
      <div class="section-center flex-center">
        <p><%= rejectMessage %></p>
      </div>
      <div class="section-bottom"></div>
    <% } %>
  `,

  // template of the `checkin` service
  'service:checkin': `
    <% if (label) { %>
      <div class="section-top flex-middle">
        <p class="big"><%= labelPrefix %></p>
      </div>
      <div class="section-center flex-center">
        <div class="checkin-label">
          <p class="huge bold"><%= label %></p>
        </div>
      </div>
      <div class="section-bottom flex-middle">
        <p class="small"><%= labelPostfix %></p>
      </div>
    <% } else { %>
      <div class="section-top"></div>
      <div class="section-center flex-center">
        <p><%= error ? errorMessage : wait %></p>
      </div>
      <div class="section-bottom"></div>
    <% } %>
  `,

  // template of the `loader` service
  'service:loader': `
    <div class="section-top flex-middle">
      <p><%= loading %></p>
    </div>
    <div class="section-center flex-center">
      <% if (showProgress) { %>
      <div class="progress-wrap">
        <div class="progress-bar"></div>
      </div>
      <% } %>
    </div>
    <div class="section-bottom"></div>
  `,

  // template of the `locator` service
  'service:locator': `
    <div class="section-square"></div>
    <div class="section-float flex-middle">
      <% if (!showBtn) { %>
        <p class="small"><%= instructions %></p>
      <% } else { %>
        <button class="btn"><%= send %></button>
      <% } %>
    </div>
  `,

  // template of the `placer` service
  'service:placer': `
    <div class="section-square<%= mode === 'list' ? ' flex-middle' : '' %>">
      <% if (rejected) { %>
      <div class="fit-container flex-middle">
        <p><%= reject %></p>
      </div>
      <% } %>
    </div>
    <div class="section-float flex-middle">
      <% if (!rejected) { %>
        <% if (mode === 'graphic') { %>
          <p><%= instructions %></p>
        <% } else if (mode === 'list') { %>
          <% if (showBtn) { %>
            <button class="btn"><%= send %></button>
          <% } %>
        <% } %>
      <% } %>
    </div>
  `,

  // template of the `platform` service
  'service:platform': `
    <% if (!isCompatible) { %>
      <div class="section-top"></div>
      <div class="section-center flex-center">
        <p><%= errorMessage %></p>
      </div>
      <div class="section-bottom"></div>
    <% } else { %>
      <div class="section-top flex-middle"></div>
      <div class="section-center flex-center">
          <p class="big">
            <%= intro %>
            <br />
            <b><%= globals.appName %></b>
          </p>
      </div>
      <div class="section-bottom flex-middle">
        <p class="small soft-blink"><%= instructions %></p>
      </div>
    <% } %>
  `,

  // template of the `sync` service
  'service:sync': `
    <div class="section-top"></div>
    <div class="section-center flex-center">
      <p class="soft-blink"><%= wait %></p>
    </div>
    <div class="section-bottom"></div>
  `,

  // template of the `survey` scene
  survey: `
    <div class="section-top">
      <% if (counter <= length) { %>
        <p class="counter"><%= counter %> / <%= length %></p>
      <% } %>
    </div>
    <% if (counter > length) { %>
      <div class="section-center flex-center">
        <p class="big"><%= thanks %></p>
      </div>
    <% } else { %>
      <div class="section-center"></div>
    <% } %>
    <div class="section-bottom flex-middle">
      <% if (counter < length) { %>
        <button class="btn"><%= next %></button>
      <% } else if (counter === length) { %>
        <button class="btn"><%= validate %></button>
      <% } %>
    </div>
  `,
};
