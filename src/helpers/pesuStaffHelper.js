export function cleanText($, selector) {
    return $(selector)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
}

export function extractListItems($, container, cleanWhitespace = false) {
    const items = [];
    $(container).find("li p").each((i, el) => {
      let text = $(el).text().trim();
      if (cleanWhitespace) {
        text = text.replace(/\n+/g, " ").replace(/\s+/g, " ");
      }
      if (text) items.push(text);
    });
    return items;
  }

export function dynamicallyExtractTabs(data) {
    const tabs = {};

    // Find all tab menu items
    const $ = data
    $(".tabs-menu li a").each((_, el) => {
      const tabName = $(el).text().trim().toLowerCase();
      const tabId = $(el).attr("href"); // e.g., "#tab-bio"

      if (tabId) {
        const tabContent = $(tabId);

        // Extract main headers and their content
        const tabData = {};

        // Find all h3 headers within this tab (these are main category headers)
        tabContent.find("h3").each((_, h3El) => {
          const headerName = $(h3El).text().trim();

          if (headerName) {
            // Find the closest parent container with class "bookings-item"
            const container = $(h3El).closest(".bookings-item");

            // Extract list items under this header
            const items = extractListItems($, container, true);

            // Store under header name
            if (items.length > 0) {
              tabData[headerName] = items;
            }
          }
        });

        // Only add tab if it has content
        if (Object.keys(tabData).length > 0) {
          tabs[tabName] = tabData;
        }
      }
    });

    return tabs;
  }


  export function dynamicallyExtractSidebar(data) {
    const sidebarData = {};
    const $ = data
    // Find all contact cards in sidebar
    $(".contat-card").each((_, el) => {
      const labelEl = $(el).find("span");
      const label = labelEl.text().trim();

      if (label) {
        // Remove the span and get remaining text
        const value = $(el)
          .clone()
          .find("span")
          .remove()
          .end()
          .text()
          .trim()
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ");

        if (value) {
          sidebarData[label] = value;
        }
      }
    });

    return sidebarData;
  }

  export function dynamicallyExtractBasicInfo(data) {
    const basicInfo = {};
    const $ = data
    // Name
    const name = $(".agent_card-title h4").text().trim();
    if (name) basicInfo["Name"] = name;

    // Designation
    const designation = cleanText($, ".geodir-category-location h5");
    if (designation) basicInfo["Designation"] = designation;

    // Image URL
    const imageUrl = $("#full-image").attr("data-bg");
    if (imageUrl) basicInfo["Image URL"] = imageUrl;

    return basicInfo;
  }



  

