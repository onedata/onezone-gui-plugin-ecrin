import applicationContainer from './components/application-container';
import checkboxFilter from './components/checkbox-filter';
import contentDisclaimer from './components/content-disclaimer';
import dataFilters from './components/data-filters';
import filtersSummary from './components/filters-summary';
import loadDialog from './components/load-dialog';
import pageFooter from './components/page-footer';
import pageHeader from './components/page-header';
import paginationSelector from './components/pagination-selector';
import queryParameters from './components/query-parameters';
import queryResults from './components/query-results';
import resourceLoadError from './components/resource-load-error';
import saveDialog from './components/save-dialog';

import indexeddbStorage from './services/indexeddb-storage';
import pdfGenerator from './services/pdf-generator';

export default {
  components: {
    applicationContainer,
    checkboxFilter,
    contentDisclaimer,
    dataFilters,
    filtersSummary,
    loadDialog,
    pageFooter,
    pageHeader,
    paginationSelector,
    queryParameters,
    queryResults,
    resourceLoadError,
    saveDialog,
  },
  services: {
    indexeddbStorage,
    pdfGenerator,
  },
};
