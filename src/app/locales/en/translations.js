import applicationContainer from './components/application-container';
import checkboxFilter from './components/checkbox-filter';
import dataFilters from './components/data-filters';
import loadDialog from './components/load-dialog';
import pageFooter from './components/page-footer';
import pageHeader from './components/page-header';
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
    dataFilters,
    loadDialog,
    pageFooter,
    pageHeader,
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
